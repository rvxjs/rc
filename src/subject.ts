import { Observable } from "./observable";

/**
 * Represents an atomic value that can be changed over time and observed.
 *
 * @example
 * ```ts
 * const subject = new Subject(7);
 *
 * subject.subscribe(value => {
 *   console.log(value);
 * });
 *
 * subject.value = 42;
 * ```
 */
export class Subject<T> extends Observable<T> {
	#value: T;
	#update: Observable.UpdateFn<T> | undefined = undefined;

	/**
	 * Create a new subject.
	 *
	 * @param value The initial value.
	 */
	public constructor(value: T) {
		super(update => {
			this.#update = update;
			return () => {
				this.#update = undefined;
			};
		}, () => this.#value, true);
		this.#value = value;
	}

	public get value() {
		return this.#value;
	}

	public set value(value: T) {
		this.#value = value;
		this.#update?.(value);
	}
}
