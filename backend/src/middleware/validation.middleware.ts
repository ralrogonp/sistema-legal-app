import { Request, Response, NextFunction } from 'express';
import { validationResult, ValidationChain } from 'express-validator';

export const validate = (validations: ValidationChain[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    for (const validation of validations) {
      await validation.run(req);
    }

    const errors = validationResult(req);
    
    if (errors.isEmpty()) {
      return next();
    }

    const extractedErrors: any[] = [];
    errors.array().map((err: any) =>
      extractedErrors.push({ [err.param]: err.msg })
    );

    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: extractedErrors
    });
  };
};

export default validate;
