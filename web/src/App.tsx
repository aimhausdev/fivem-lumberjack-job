import { useState, useEffect } from 'react'
import Button from '@mui/material/Button'
import Box from '@mui/material/Box'
import { isEnvBrowser } from './utils/misc'
import { useNuiEvent } from './hooks/useNuiEvent'
import { fetchNui } from './utils/fetchNui'

type FlexArgs = {
  dir?: React.CSSProperties['flexDirection'],
  wrap?: React.CSSProperties['flexWrap'],
  jc?: React.CSSProperties['justifyContent'],
  ai?: React.CSSProperties['alignItems'],
}
const flex = ({dir = 'row', wrap = 'nowrap', jc = 'center', ai = 'center'}: FlexArgs = {}) => ({
  display: 'flex',
  flexFlow: `${dir} ${wrap}`,
  justifyContent: jc,
  alignItems: ai,
})

type OptionProps = {
  onClick?: (action?: string, value?: any) => void,
  label?: string,
  action?: string,
  value?: any,
}

const Option: React.FC<OptionProps> = ({action, label, onClick, value}) => (
  <Button
    value="3"
    variant="contained"
    sx={{width: 256, marginBottom: 1}}
    size="small"
    onClick={() => onClick?.(action, value)}>
    {label}
  </Button>
)

type OptionType = {
  action: string,
  label: string,
  value: string|number,
}

function App() {
  const [visible, setVisible] = useState(isEnvBrowser())
  const [count, setCount] = useState(0)
  const [clicked, setClicked] = useState(false)
  const [target, setTarget] = useState(0)
  const [options, setOptions] = useState<OptionType[]>([])

  useNuiEvent('setVisible', (data: { visible?: boolean }) => {
    setVisible(data.visible || false)
    // console.log(`inside 'setVisible' event, data.visible=${data.visible}`)
    setClicked(false)
    // if (!data.visible) {
    //   setClicked(false)
    // }
  })

  const close = () => {
    setVisible(false)
    setClicked(false)
    fetchNui('closeMenu')
  }

  useNuiEvent('setTarget', ({target: newTarget = 0}: {target: number}) => setTarget(newTarget))

  useNuiEvent('setOptions', (options: OptionType[]) => setOptions(options))

  const send = (action?: string, value?: any) => fetchNui('uiAction', {action, value})

  // @ts-ignore
  const handleSelectOption = (action?: string, value?: any) => {
    console.log(`calling send(action=${action}, value=${value})`)
    send(action, value)
    close()
  }
  function handleHideModal() {
    close()
  }

  const handleKeyUp = (ev: KeyboardEvent | React.KeyboardEvent<HTMLDivElement>) => {
    // console.log(ev.key, ev.key === 'Alt', `clicked=${clicked}`)
    // console.log(ev.key === 'Alt' && !clicked)
    if (ev.key === 'Alt' && !clicked) {
      // console.log('ALT key released, modal not clicked yet')
      // handleHideModal()
      close()
    } else if (ev.key === 'Escape') {
      close()
    }
  }

  const handleClick = () => {
    // console.log(`clicked! currently clicked=${clicked}`)
    if (!options.length) return
    if (!clicked) fetchNui('setNuiFocus')
    if (visible) setClicked(true)
  }

  const triggerChopAnimation = () => {
    fetchNui('playAnimation', {target})
    handleHideModal()
  }

  useEffect(() => {
    window.addEventListener('keyup', handleKeyUp)
    return () => window.removeEventListener('keyup', handleKeyUp)
  })

  return visible && (
    <Box sx={{...flex({dir: 'column'}), width: '100vw', height: '100vh'}} onClick={handleClick}>
      <Box sx={{...flex({dir: 'column'}), position: 'absolute', left: '55vw', top: '45vh'}}>
        {/* <Option label="Test" action="run_test" value="holy shit a value" onClick={handleSelectOption} /> */}
        {options.map(({action, label, value}) => (
          <Option key={`${action}:${label}:${value}`} action={action} value={value} label={label} onClick={handleSelectOption} />
        ))}
        {/* {target > 0 && <Option label="Chop tree!" onClick={() => triggerChopAnimation()} />} */}
        {/* <Option label="Close" onClick={() => handleHideModal()} /> */}
      </Box>
    </Box>
  )
}

export default App
