import { useEffect } from 'react'
type Destructor = ()=>void
type MountEffect = ()=>Destructor|undefined
const useOnMount = (callback:MountEffect)=>{
	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(callback,[])
}
export default useOnMount
