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
  const [clicked, setClicked] = useState(false)
  const [options, setOptions] = useState<OptionType[]>([])

  useNuiEvent('setVisible', (data: { visible?: boolean }) => {
    setVisible(data.visible || false)
    setClicked(false)
  })

  const close = () => {
    setVisible(false)
    setClicked(false)
    fetchNui('closeMenu')
  }

  useNuiEvent('setOptions', (options: OptionType[]) => setOptions(options))

  const send = (action?: string, value?: any) => fetchNui('uiAction', {action, value})

  const handleSelectOption = (action?: string, value?: any) => {
    send(action, value)
    close()
  }

  const handleKeyUp = (ev: KeyboardEvent | React.KeyboardEvent<HTMLDivElement>) => {
    if ((ev.key === 'Alt' && !clicked) || ev.key === 'Escape') close()
  }

  const handleClick = () => {
    if (!options.length) return
    if (!clicked) fetchNui('setNuiFocus')
    if (visible) setClicked(true)
  }

  useEffect(() => {
    window.addEventListener('keyup', handleKeyUp)
    return () => window.removeEventListener('keyup', handleKeyUp)
  })

  return visible && (
    <Box sx={{...flex({dir: 'column'}), width: '100vw', height: '100vh'}} onClick={handleClick}>
      <Box sx={{...flex({dir: 'column'}), position: 'absolute', left: '55vw', top: '45vh'}}>
        {options.map(({action, label, value}) => (
          <Option key={`${action}:${label}:${value}`} action={action} value={value} label={label} onClick={handleSelectOption} />
        ))}
      </Box>
    </Box>
  )
}

export default App
