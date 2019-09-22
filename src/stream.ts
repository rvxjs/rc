import { Disposable, dispose } from "./disposable";

export interface StreamHandler<T> {
	push(value: T): void;
	error(error: any): void;
}

export type StreamStart<T> = (this: StreamHandler<T>, handler: StreamHandler<T>) => Disposable;
export type StreamAttach<T> = (this: StreamHandler<T>, handler: Partial<StreamHandler<T>>) => void;

const HANDLERS = Symbol("handlers");
const STARTED = Symbol("started");
const CYCLE = Symbol("cycle");

export class Stream<T> {
	public constructor(start?: StreamStart<T>, attach?: StreamAttach<T>) {
		if (start) {
			this.start = start;
		}
		if (attach) {
			this.attach = attach;
		}
	}

	private [HANDLERS] = new Set<Partial<StreamHandler<T>>>();
	private [STARTED] = false;
	private [CYCLE]: Disposable = undefined;

	protected start(handler: StreamHandler<T>) { }
	protected attach(handler: Partial<StreamHandler<T>>) { }

	public pull(handler: Partial<StreamHandler<T>>): Disposable {
		this.attach(handler);
		this[HANDLERS].add(handler);

		if (this[STARTED]) {
			this[STARTED] = true;
			this[CYCLE] = this.start(this);
		}

		return () => {
			if (this[HANDLERS].delete(handler) && this[HANDLERS].size === 0) {
				dispose(this[CYCLE]);
				this[STARTED] = false;
				this[CYCLE] = undefined;
			}
		};
	}

	public push(value: T) {
		this[HANDLERS].forEach(handler => {
			if (handler.push) {
				handler.push(value);
			}
		});
	}

	public error(error: any) {
		this[HANDLERS].forEach(handler => {
			if (handler.error) {
				handler.error(error);
			}
		});
	}
}
