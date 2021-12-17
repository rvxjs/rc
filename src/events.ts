/**
 * A function that is called when an event is emitted.
 */
export type EventListener<T extends any[]> = (...args: T) => void;

/**
 * A function that can be called to remove a previously attached event listener.
 */
export type EventSubscription = () => void;

/**
 * A function that can be called to attach an event listener.
 *
 * Listeners are called in the order they are attached.
 */
export type Event<T extends any[]> = (listener: EventListener<T>) => EventSubscription;

/**
 * An emitter can be used to emit events.
 *
 * @example
 * ```ts
 * class Example {
 *   readonly #onMessage = new Emitter<[message: string, sender: string]>();
 *   public readonly onMessage = this.#onMessage.event;
 *
 *   public something() {
 *     this.#onMessage.emit("Hello World!", "something");
 *   }
 * }
 *
 * const example = new Example();
 *
 * example.onMessage((message, sender) => {
 *   console.log(`Message from ${sender}: ${message}`);
 * });
 *
 * example.something();
 * ```
 */
export class Emitter<T extends any[]> {
	/**
	 * Set of event listeners attached to this emitter.
	 */
	public readonly listeners = new Set<EventListener<T>>();

	/**
	 * Emit this event.
	 * @returns `true` if any listeners have been called.
	 */
	public emit(...args: T): boolean;
	public emit() {
		if (this.listeners.size > 0) {
			this.listeners.forEach(listener => listener.apply(null, arguments as unknown as T));
			return true;
		}
		return false;
	}

	/**
	 * Emit this event.
	 * @param getArgs A function that is called to get the event arguments only if at least one listener will be called.
	 * @returns `true` if any listeners have been called.
	 */
	public emitLazy(getArgs: () => T) {
		if (this.listeners.size > 0) {
			const args = getArgs();
			this.listeners.forEach(listener => listener.apply(null, args));
			return true;
		}
		return false;
	}

	/**
	 * The event that is controller by this emitter.
	 */
	public readonly event: Event<T> = listener => {
		this.listeners.add(listener);
		return () => {
			this.listeners.delete(listener);
		};
	};
}
