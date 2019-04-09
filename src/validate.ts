import * as jsonschema from 'jsonschema';
import { ValueOf, Typeable } from './typeable';

function formatErr(err: jsonschema.ValidationError): string {
  return (
    err.property + ' (' + JSON.stringify(err.instance) + ') ' + err.message
  );
}

export function validate<t>(
  type: Typeable<t>,
  instance: any
): ValueOf<Typeable<t>> {
  const result = jsonschema.validate(instance, type.schema);
  if (!result.valid) {
    const errs = result.errors.map(formatErr);
    if (errs.length > 1) {
      throw new TypeError(
        'Errors validating input against typeable:\n- ' + errs.join('\n- ')
      );
    }
    throw new TypeError('Error validating input against typeable: ' + errs[0]);
  }
  return instance;
}
