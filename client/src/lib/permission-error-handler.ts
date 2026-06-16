let permissionDeniedCallback: (() => void) | null = null;

export function setPermissionDeniedCallback(callback: () => void) {
  permissionDeniedCallback = callback;
}

export function showPermissionDenied() {
  if (permissionDeniedCallback) {
    permissionDeniedCallback();
  }
}

export function isPermissionError(error: any): boolean {
  if (!error) return false;
  
  const errorMessage = error.message || error.toString();
  
  return (
    errorMessage.includes('403') ||
    errorMessage.includes('Forbidden') ||
    errorMessage.toLowerCase().includes('permission denied') ||
    errorMessage.toLowerCase().includes('not authorized') ||
    errorMessage.toLowerCase().includes('insufficient permissions')
  );
}

export function handleMutationError(error: any, fallbackToast?: (error: any) => void) {
  if (isPermissionError(error)) {
    showPermissionDenied();
    return true;
  }
  
  if (fallbackToast) {
    fallbackToast(error);
  }
  
  return false;
}
