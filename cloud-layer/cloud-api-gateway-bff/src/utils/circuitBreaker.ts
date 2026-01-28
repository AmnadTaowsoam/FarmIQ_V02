import { logger } from './logger'

enum State {
    CLOSED,
    OPEN,
    HALF_OPEN,
}

export class CircuitBreaker {
    public state: State = State.CLOSED
    private failureCount = 0
    private successCount = 0
    private nextAttempt = Date.now()

    // Options
    private failureThreshold = 5
    private coolingPeriod = 10000 // 10s

    constructor(private name: string) { }

    public async fire<T>(action: () => Promise<T>): Promise<T> {
        if (this.state === State.OPEN) {
            if (Date.now() <= this.nextAttempt) {
                throw new Error(`CircuitBreaker '${this.name}' is OPEN`)
            }
            this.state = State.HALF_OPEN
        }

        try {
            const result = await action()
            return this.onSuccess(result)
        } catch (err) {
            return this.onFailure(err)
        }
    }

    private onSuccess<T>(result: T): T {
        this.failureCount = 0
        if (this.state === State.HALF_OPEN) {
            this.successCount++
            if (this.successCount > 2) {
                this.state = State.CLOSED
                logger.info(`CircuitBreaker '${this.name}' closed`)
            }
        }
        return result
    }

    private onFailure(err: any): never {
        this.failureCount++
        if (this.failureCount >= this.failureThreshold) {
            this.state = State.OPEN
            this.nextAttempt = Date.now() + this.coolingPeriod
            logger.warn(`CircuitBreaker '${this.name}' OPENED due to ${this.failureCount} failures`)
        }
        throw err
    }
}
