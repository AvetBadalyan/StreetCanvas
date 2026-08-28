/**
 * A tiny validation vocabulary: a field declares the rules it cares about, and
 * `validate` applies them.
 *
 * Only the rules this app actually uses are defined - the original version
 * carried MIN/MAX/FILE variants, two of which `validate` never even handled.
 */

const REQUIRE = "REQUIRE";
const MINLENGTH = "MINLENGTH";
const MAXLENGTH = "MAXLENGTH";
const EMAIL = "EMAIL";

export const VALIDATOR_REQUIRE = () => ({ type: REQUIRE });
export const VALIDATOR_MINLENGTH = (val) => ({ type: MINLENGTH, val });
export const VALIDATOR_MAXLENGTH = (val) => ({ type: MAXLENGTH, val });
export const VALIDATOR_EMAIL = () => ({ type: EMAIL });

export const validate = (value, validators) =>
  validators.every((validator) => {
    const trimmed = String(value ?? "").trim();

    switch (validator.type) {
      case REQUIRE:
        return trimmed.length > 0;
      case MINLENGTH:
        return trimmed.length >= validator.val;
      case MAXLENGTH:
        return trimmed.length <= validator.val;
      case EMAIL:
        return /^\S+@\S+\.\S+$/.test(trimmed);
      default:
        return true;
    }
  });
