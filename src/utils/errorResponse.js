export const sendError = (res, status, message, code) => {
  return res.status(status).json({ message, code });
};

export const logError = (context, error) => {
  console.error(`[${context}]`, error);
};

export const isUniqueConstraintError = (error) => {
  return error?.name === "SequelizeUniqueConstraintError";
};

export const isValidationError = (error) => {
  return error?.name === "SequelizeValidationError";
};
