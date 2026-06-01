export const sendSuccess = (res, data = {}, statusCode = 200, meta = undefined) =>
  res.status(statusCode).json({
    success: true,
    data,
    meta,
    requestId: res.locals.requestId
  });

export const sendMessage = (res, message, statusCode = 200, data = {}) =>
  sendSuccess(res, { message, ...data }, statusCode);

