import { useState, useCallback } from 'react';

export function useForm<T extends Record<string, any>>(
  initialValues: T,
  onSubmit: (values: T) => Promise<void>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = useCallback((field: keyof T, value: any) => {
    setValues(prev => ({
      ...prev,
      [field]: value
    }));
    // Clear error for field on change
    if (errors[field as string]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[field as string];
        return copy;
      });
    }
  }, [errors]);

  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setIsSubmitting(false);
  }, [initialValues]);

  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setErrors({});
    try {
      await onSubmit(values);
    } catch (err: any) {
      const fieldErrors = err.response?.data?.errors;
      if (fieldErrors) {
        setErrors(fieldErrors);
      } else {
        setErrors({
          global: err.response?.data?.message || err.message || 'Error al procesar el formulario'
        });
      }
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  }, [values, onSubmit]);

  return {
    values,
    setValues,
    errors,
    setErrors,
    isSubmitting,
    handleChange,
    resetForm,
    handleSubmit
  };
}

export default useForm;
