import darkLogo from '../../assets/smartkart-ai-dark.svg'
import lightLogo from '../../assets/smartkart-ai-light.svg'

export default function SmartKartLogo({ isDarkMode = true, className = '' }) {
  return <img src={isDarkMode ? darkLogo : lightLogo} alt="SmartKart AI" className={`object-contain ${className}`} />
}
