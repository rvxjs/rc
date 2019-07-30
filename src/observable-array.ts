import { PatchObservable, PatchObserver, Unit, UnitRange } from "./patch-observable";

const RANGE = Symbol("range");
const PROJECTION = Symbol("projection");
const TARGET = Symbol("target");

export class ObservableArray<T> extends PatchObservable<T> implements Array<T> {
	public constructor(proxy = true) {
		super();
		if (proxy) {
			return new Proxy(this[TARGET], {
				get: (_, prop) => {
					const index = parseIndex(prop);
					if (index === null) {
						return Reflect.get(this, prop);
					} else {
						return this.get(index);
					}
				},
				set: (_, prop, value) => {
					const index = parseIndex(prop);
					if (index === null) {
						return Reflect.set(this, prop, value);
					} else {
						this.set(index, value);
						return true;
					}
				},
				deleteProperty: (_, prop) => {
					const index = parseIndex(prop);
					if (index === null) {
						return Reflect.deleteProperty(this, prop);
					} else {
						this.delete(index);
						return true;
					}
				},
				has: (_, prop) => {
					const index = parseIndex(prop);
					if (index === null) {
						return Reflect.has(this, prop);
					} else {
						return this.has(index);
					}
				}
			}) as this;
		}
	}

	private readonly [RANGE]: UnitRange<T> = { next: null, prev: null };
	private readonly [PROJECTION]: Unit<T>[] = [];
	private readonly [TARGET]: T[] = [];

	protected onSubscribe(observer: Partial<PatchObserver<T>>) {
		if (observer.patch) {
			observer.patch({ prev: null, next: null, stale: null, fresh: this[RANGE].next ? this[RANGE] : null });
		}
	}

	[n: number]: T;

	public get length() {
		return this[TARGET].length;
	}

	public set length(value: number) {
		value = Math.max(0, value);
		const range = this[RANGE];
		const projection = this[PROJECTION];
		const target = this[TARGET];
		const oldLength = target.length;
		if (value > oldLength) {
			for (let i = oldLength; i < value; i++) {
				const prev = projection[i - 1];
				(prev || range).next = projection[i] = { prev, next: null, value: undefined };
			}
			range.prev = projection[value - 1];
			target.length = value;
			this.notifyPatch({ prev: projection[oldLength - 1], next: null, stale: null, fresh: { next: projection[oldLength], prev: projection[value - 1] } });
		} else {
			const stale: UnitRange<T> = { next: projection[value], prev: projection[oldLength - 1] };
			const prev = projection[value - 1];
			if (prev) {
				prev.next = null;
				range.prev = prev;
			}
			projection.length = value;
			target.length = value;
			this.notifyPatch({ prev, next: null, stale, fresh: null });
		}
	}

	public get(index: number) {
		return this[TARGET][index];
	}

	public set(index: number, value: T) {
		const range = this[RANGE];
		const projection = this[PROJECTION];
		const target = this[TARGET];
		const oldLength = target.length;

		if (index < oldLength) {
			const oldUnit = projection[index];
			const unit: Unit<T> = { prev: oldUnit.prev, next: oldUnit.next, value };
			(oldUnit.prev || range).next = unit;
			(oldUnit.next || range).prev = unit;
			projection[index] = unit;
			target[index] = value;
			this.notifyPatch({ prev: oldUnit.prev, next: oldUnit.next, stale: { next: oldUnit, prev: oldUnit }, fresh: { next: unit, prev: unit } });
		} else {
			for (let i = oldLength; i < index; i++) {
				const prev = projection[i - 1];
				(prev || range).next = projection[i] = { prev, next: null, value: undefined };
			}
			const prev = projection[index - 1];
			range.prev = (prev || range).next = projection[index] = { prev, next: null, value };
			target[index] = value;
			this.notifyPatch({ prev: projection[oldLength - 1], next: null, stale: null, fresh: { next: projection[oldLength], prev: projection[index] } });
		}
	}

	public delete(index: number) {
		const target = this[TARGET];
		if (index in target) {
			const range = this[RANGE];
			const projection = this[PROJECTION];
			const oldUnit = projection[index];
			const unit: Unit<T> = { prev: oldUnit.prev, next: oldUnit.next, value: undefined };
			(oldUnit.prev || range).next = unit;
			(oldUnit.next || range).prev = unit;
			projection[index] = unit;
			delete this[TARGET][index];
			this.notifyPatch({ prev: oldUnit.prev, next: oldUnit.next, stale: { next: oldUnit, prev: oldUnit }, fresh: { next: unit, prev: unit } });
		}
	}

	public has(index: number) {
		return index in this[TARGET];
	}

	public toString() {
		return this[TARGET].toString();
	}

	public toLocaleString(locales?: any, options?: any) {
		return (this[TARGET] as any).toLocaleString(locales, options);
	}

	public pop() {
		const range = this[RANGE];
		const projection = this[PROJECTION];
		const target = this[TARGET];
		const unit = projection.pop();
		if (unit) {
			const prev = unit.prev;
			range.prev = prev;
			(prev || range).next = null;
			const value = target.pop();
			this.notifyPatch({ prev, next: null, stale: { next: unit, prev: unit }, fresh: null });
			return value;
		}
	}

	public push(...items: T[]) {
		if (items.length > 0) {
			const range = this[RANGE];
			const projection = this[PROJECTION];
			const target = this[TARGET];
			const oldLength = target.length;
			let prev = projection[oldLength - 1];
			for (const value of items) {
				const unit: Unit<T> = { prev, next: null, value };
				projection.push((prev || range).next = unit);
				prev = unit;
			}
			range.prev = prev;
			const result = this[TARGET].push(...items);
			this.notifyPatch({ prev: projection[oldLength - 1], next: null, stale: null, fresh: { next: projection[oldLength], prev } });
			return result;
		}
	}

	public concat(...items: (T | ConcatArray<T>)[]): T[];
	public concat(...items: any[]) {
		return this[TARGET].concat(...items);
	}

	public join(separator?: string): string {
		return this[TARGET].join(separator);
	}

	public reverse() {
		// TODO: Patch.
		this[TARGET].reverse();
		return this;
	}

	public shift(): T {
		// TODO: Patch.
		return this[TARGET].shift();
	}

	public slice(start?: number, end?: number): T[] {
		return this[TARGET].slice(start, end);
	}

	public sort(compareFn?: (a: T, b: T) => number) {
		// TODO: Patch.
		this[TARGET].sort(compareFn);
		return this;
	}

	public splice(start: number, deleteCount?: number, ...items: T[]): T[] {
		// TODO: Patch.
		return this[TARGET].splice(start, deleteCount, ...items);
	}

	public unshift(...items: T[]): number {
		// TODO: Patch.
		return this[TARGET].unshift(...items);
	}

	public indexOf(item: T, fromIndex?: number): number {
		return this[TARGET].indexOf(item, fromIndex);
	}

	public lastIndexOf(item: T, fromIndex?: number): number {
		return this[TARGET].lastIndexOf(item, fromIndex);
	}

	public every(callbackfn: (value: T, index: number, array: T[]) => unknown, thisArg?: any): boolean {
		return this[TARGET].every(callbackfn, thisArg);
	}

	public some(callbackfn: (value: T, index: number, array: T[]) => unknown, thisArg?: any): boolean {
		return this[TARGET].some(callbackfn, thisArg);
	}

	public forEach(callbackfn: (value: T, index: number, array: T[]) => void, thisArg?: any): void {
		return this[TARGET].forEach(callbackfn, thisArg);
	}

	public map<U>(callbackfn: (value: T, index: number, array: T[]) => U, thisArg?: any): U[] {
		return this[TARGET].map(callbackfn, thisArg);
	}

	public filter<S extends T>(callbackfn: (value: T, index: number, array: T[]) => value is S, thisArg?: any): S[];
	public filter(callbackfn: (value: T, index: number, array: T[]) => any, thisArg?: any): T[];
	public filter(callbackfn: any, thisArg?: any) {
		return this[TARGET].filter(callbackfn, thisArg);
	}

	public reduce(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T, initialValue?: T): T;
	public reduce<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
	public reduce(callbackfn: any, initialValue?: any) {
		return this[TARGET].reduce(callbackfn, initialValue);
	}

	public reduceRight(callbackfn: (previousValue: T, currentValue: T, currentIndex: number, array: T[]) => T, initialValue?: T): T;
	public reduceRight<U>(callbackfn: (previousValue: U, currentValue: T, currentIndex: number, array: T[]) => U, initialValue: U): U;
	public reduceRight(callbackfn: any, initialValue?: any) {
		return this[TARGET].reduceRight(callbackfn, initialValue);
	}

	public find<S extends T>(predicate: (this: void, value: T, index: number, obj: T[]) => value is S, thisArg?: any): S;
	public find(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): T;
	public find(predicate: any, thisArg?: any) {
		return this[TARGET].find(predicate, thisArg);
	}

	public findIndex(predicate: (value: T, index: number, obj: T[]) => unknown, thisArg?: any): number {
		return this[TARGET].findIndex(predicate, thisArg);
	}

	public fill(value: T, start?: number, end?: number) {
		// TODO: Patch.
		this[TARGET].fill(value, start, end);
		return this;
	}

	public copyWithin(target: number, start: number, end?: number): this {
		// TODO: Patch.
		this[TARGET].copyWithin(target, start, end);
		return this;
	}

	public [Symbol.iterator](): IterableIterator<T> {
		return this[TARGET][Symbol.iterator]();
	}

	public entries(): IterableIterator<[number, T]> {
		return this[TARGET].entries();
	}

	public keys(): IterableIterator<number> {
		return this[TARGET].keys();
	}

	public values(): IterableIterator<T> {
		return this[TARGET].values();
	}

	public [Symbol.unscopables](): any {
		return this[TARGET][Symbol.unscopables]();
	}

	public includes(searchElement: T, fromIndex?: number): boolean {
		return this[TARGET].includes(searchElement, fromIndex);
	}

	public static [Symbol.hasInstance](value: any) {
		return value && (TARGET in value);
	}
}

function parseIndex(value: string | number | symbol) {
	if (typeof value === "symbol") {
		return null;
	}
	const index = Number(value);
	return (index | 0) === index && index >= 0 ? index : null;
}
