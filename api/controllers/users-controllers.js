const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const HttpError = require("../models/http-error");
const User = require("../models/user");
const asyncHandler = require("../util/async-handler");
const { saveImage, destroyImage } = require("../util/image-store");

// Mirrored by TOKEN_TTL_MS in the frontend's auth-hook, which schedules the
// automatic sign-out.
const TOKEN_TTL = "7d";

const signToken = (user) =>
  jwt.sign({ userId: user.id, email: user.email }, process.env.JWT_KEY, {
    expiresIn: TOKEN_TTL,
  });

// The client stores exactly these fields; keeping the shape in one place means
// signup and login cannot drift apart.
const authPayload = (user, token) => ({
  userId: user.id,
  name: user.name,
  email: user.email,
  image: user.image,
  token,
});

// Public: this list feeds the Contributors page, which only ever shows a
// name, an avatar and a place count, so email is excluded rather than sent
// and ignored.
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({}, "-password -email").sort({ createdAt: -1 });
  res.json({ users: users.map((user) => user.toObject({ getters: true })) });
});

const signup = asyncHandler(async (req, res, next) => {
  // multer runs ahead of the validators, so an omitted avatar arrives as an
  // absent `req.file` and would otherwise throw on `req.file.path`.
  if (!req.file) {
    return next(new HttpError("A profile photo is required.", 422));
  }

  const { name, email, password } = req.body;

  if (await User.exists({ email })) {
    return next(
      new HttpError("An account with this email already exists.", 422)
    );
  }

  // Stored only once the email is known to be free, so a rejected signup never
  // leaves an avatar behind.
  const image = await saveImage(req.file);

  const createdUser = new User({
    name,
    email,
    image: image.url,
    imagePublicId: image.publicId,
    password: await bcrypt.hash(password, 12),
    places: [],
  });

  try {
    await createdUser.save();
  } catch (err) {
    await destroyImage(image);
    // Two simultaneous signups can both pass the check above; the unique index
    // is what actually guarantees it.
    if (err.code === 11000) {
      return next(
        new HttpError("An account with this email already exists.", 422)
      );
    }
    throw err;
  }

  res.status(201).json(authPayload(createdUser, signToken(createdUser)));
});

const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  const existingUser = await User.findOne({ email });

  // Same message and status whether the email or the password was wrong, so the
  // endpoint cannot be used to enumerate registered addresses.
  const invalidCredentials = () =>
    next(new HttpError("Invalid credentials, could not log you in.", 401));

  if (!existingUser) {
    return invalidCredentials();
  }

  const isValidPassword = await bcrypt.compare(password, existingUser.password);
  if (!isValidPassword) {
    return invalidCredentials();
  }

  res.json(authPayload(existingUser, signToken(existingUser)));
});

module.exports = { getUsers, signup, login };
