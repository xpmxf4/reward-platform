export class RetryHelper {
  /**
   * 재시도 로직을 구현하는 함수
   * @param fn 실행할 함수
   * @param retries 재시도 횟수
   * @param delay 재시도 간격 (ms)
   * @param backoff 실패 시 지연 시간 증가 계수
   */
  static async retry<T>(
    fn: () => Promise<T>,
    retries = 3,
    delay = 1000,
    backoff = 2,
  ): Promise<T> {
    try {
      return await fn();
    } catch (error) {
      if (retries <= 0) {
        throw error;
      }

      console.log(`Retrying operation, ${retries} attempts left. Error: ${error.message}`);

      // 지정된 시간만큼 대기
      await new Promise(resolve => setTimeout(resolve, delay));

      // 재귀적으로 재시도하며 지연 시간 증가
      return this.retry(fn, retries - 1, delay * backoff, backoff);
    }
  }
}