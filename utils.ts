export function formatJsonResponse(data: any) {
  if (!data) {
    return {
      success: true,
      total: 0,
      data: null,
    };
  }
  if (Array.isArray(data)) {
    return {
      success: true,
      total: data.length,
      data,
    };
  }
  return {
    success: true,
    total: 1,
    data,
  };
}

export function formatError(error: any) {
  return {
    success: false,
    message: error?.message || JSON.stringify(error),
  };
}
