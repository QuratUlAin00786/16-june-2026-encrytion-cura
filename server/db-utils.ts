// Database utility functions for handling transient connection errors

export async function retryDatabaseOperation<T>(
  operation: () => Promise<T>, 
  operationName = 'database operation'
): Promise<T> {
  const maxRetries = 3; // Increased from 2 to 3 as recommended
  const baseDelay = 100; // Start with 100ms
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error: any) {
      const isTransientError = 
        error?.code === '57P01' || // Connection terminated
        error?.code === '57P03' || // Connection terminated due to admin shutdown
        error?.code === '53300' || // Too many connections
        error?.code === 'ECONNRESET' || 
        error?.code === 'ETIMEDOUT' ||
        error?.message?.includes('terminating connection') ||
        error?.message?.includes('server closed the connection unexpectedly') ||
        error?.message?.includes('WebSocket closed') ||
        error?.message?.includes('Socket hang up');
      
      if (isTransientError && attempt < maxRetries) {
        const jitter = Math.random() * 0.1; // 10% jitter
        const delay = baseDelay * Math.pow(3, attempt) * (1 + jitter);
        console.warn(`[RETRY] ${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay.toFixed(0)}ms:`, error?.message);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Last attempt or non-transient error
      if (isTransientError) {
        console.error(`[DB_TRANSIENT_ERROR] ${operationName} failed after ${maxRetries + 1} attempts:`, error?.message);
        // Return a service unavailable error that can be distinguished from validation errors
        const serviceError = new Error(`Service temporarily unavailable. Please try again in a moment.`);
        (serviceError as any).code = 'SERVICE_UNAVAILABLE';
        (serviceError as any).statusCode = 503;
        throw serviceError;
      } else {
        console.error(`[DB_ERROR] ${operationName} failed with non-transient error:`, error);
        throw error;
      }
    }
  }
  
  throw new Error('Unexpected retry logic error');
}