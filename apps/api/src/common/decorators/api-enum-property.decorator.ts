import { applyDecorators } from '@nestjs/common';
import { ApiPropertyOptional } from '@nestjs/swagger';

export function ApiEnumPropertyOptional(
  enumObject: Record<string, string | number>,
  description?: string,
  example?: string | number,
) {
  const enumValues = Object.values(enumObject);
  const enumKeys = Object.keys(enumObject);

  return applyDecorators(
    ApiPropertyOptional({
      description,
      enum: enumValues,
      example: example || enumValues[0],
      'x-enum-varnames': enumKeys, // Explicit enum variable names for OpenAPI generator
    } as any),
  );
}
