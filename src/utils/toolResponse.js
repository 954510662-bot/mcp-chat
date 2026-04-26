export function okResponse(data, text) {
  return {
    ok: true,
    data,
    error: null,
    meta: {
      timestamp: new Date().toISOString()
    },
    text: text ?? "ok"
  };
}

export function errorResponse(error, code = "INTERNAL_ERROR") {
  return {
    ok: false,
    data: null,
    error: {
      code,
      message: error instanceof Error ? error.message : String(error)
    },
    meta: {
      timestamp: new Date().toISOString()
    },
    text: error instanceof Error ? error.message : String(error)
  };
}

export async function withToolResponse(handler) {
  try {
    return handler ? await handler() : okResponse(null);
  } catch (error) {
    return errorResponse(error);
  }
}
