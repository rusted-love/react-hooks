import { MutableRefObject, useCallback, useMemo, useRef, useState } from 'react'
import useVariable from './useVariable'

export type PromiseHandlerError = string | Error
export type PromiseHandlerResult<D> = PromiseState<D> & {
	readonly setPromise: (promise: Promise<D>|null,options?:PromiseHandlerOptions<D>) => void
	readonly getPromise: () => Promise<D> | null
}
type PromiseRef<T> = MutableRefObject<Promise<T> | null>
const normalizeError = (err: unknown): PromiseHandlerError => {
	if (err instanceof Error) {
		return err
	}
	if (typeof err === 'string') {
		return err
	}
	console.error('Unexpected promise error format', err)
	return 'Unexpected error format'
}
type StateStalled = {
	readonly error: null
	readonly result: null
	readonly loading: false
	readonly promise: null
}
type StateError<T> = {
	readonly error: PromiseHandlerError
	readonly result: null
	readonly loading: false
	readonly promise: Promise<T>
}
type StateOk<T> = {
	readonly error: null
	readonly result: T
	readonly loading: false
	readonly promise: Promise<T>
}
type StateLoading<T> = {
	readonly error: null
	readonly result: null
	readonly loading: true
	readonly promise: Promise<T>
}
const defaultState: StateStalled = {
	error: null,
	result: null,
	loading: false,
	promise: null
} as const
type PromiseState<T> =
	| StateStalled
	| StateOk<T>
	| StateError<T>
	| StateLoading<T>
export type PromiseHandlerOptions<T> = {
	readonly onCompleted?: (data: T) => void,
	readonly onError?: (error: PromiseHandlerError) => void
}
const usePromiseHandler = <T>(options?: PromiseHandlerOptions<T>): PromiseHandlerResult<T> => {
	const [state, setState] = useState<PromiseState<T>>(defaultState)
	const promiseRef: PromiseRef<T> = useRef(null)
	const optionsRef = useVariable(options)
	const setPromise = useCallback((promise: Promise<T> | null, contextOptions?:PromiseHandlerOptions<T>) => {
		promiseRef.current = promise
		if (promise === null) {
			setState(defaultState)
			return
		}
		setState({
			...defaultState,
			loading: true,
			promise
		})
		const executeIsActual = (): boolean => promise === promiseRef.current

		promise
			.then((resp) => {
				if (executeIsActual()) {
					const resultListener = optionsRef.current?.onCompleted
					if (resultListener) {
						resultListener(resp)
					}
					if (contextOptions && contextOptions.onCompleted) {
						contextOptions.onCompleted(resp)
					}

					setState({
						error: null,
						loading: false,
						result: resp,
						promise: promise
					})
				}
			})
			.catch((err: unknown) => {

				if (executeIsActual()) {
					const errorListener = optionsRef.current?.onError
					const normalizedError = normalizeError(err)
					if (errorListener) {
						errorListener(normalizedError)
					}
					if (contextOptions && contextOptions.onError) {
						contextOptions.onError(normalizedError)
					}
					setState({
						error: normalizedError,
						loading: false,
						result: null,
						promise: promise
					})
				}

			})
	}, [optionsRef])
	return useMemo<PromiseHandlerResult<T>>(() => {
		return {
			...state,
			setPromise,
			getPromise: () => promiseRef.current
		}
	}, [state, setPromise])
}
export default usePromiseHandler
