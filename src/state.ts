import { Observable } from "./observable";

const VALUE = Symbol("value");

export class State<T = any> extends Observable<T> {
	public constructor(value?: T) {
		super();
		this[VALUE] = value;
	}

	private [VALUE]: T;

	public get value() {
		return this[VALUE];
	}

	public set value(value: T) {
		this[VALUE] = value;
		if (value !== undefined) {
			this.notifyResolve(value);
		}
	}

	public resolve(value: T) { }
	public reject(error: any) { }
}

Observable.implementObserver(State);
