import OnboardingWizard from './components/OnboardingWizard'
import OnboardingCheck from './components/OnboardingCheck'

export default function OnboardingPage() {
  return (
      <OnboardingCheck>
        <OnboardingWizard />
      </OnboardingCheck> 
  )
}