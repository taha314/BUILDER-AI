import { Loader2Icon } from 'lucide-react'

const Loading = () => {
  return (
    <div className='flex justify-center items-center h-screen bg-white'>
      <Loader2Icon size={26} className='animate-spin text-zinc-950'/>
    </div>
  )
}

export default Loading
