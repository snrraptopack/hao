import { Component, ref, watch } from 'auwla'
import type { LayoutBuilder, Ref } from 'auwla'

export default function FormValidationPage() {
  // Logic that was outside page scope → now inside page scope
  const formData = ref({
  // Personal info
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  // Account type
  accountType: 'personal',
  // 'personal', 'business', 'enterprise'

  // Business fields (conditional)
  companyName: '',
  taxId: '',
  industry: '',
  employeeCount: '',
  // Enterprise fields (conditional)
  contactPerson: '',
  department: '',
  budget: '',
  // Preferences
  newsletter: false,
  smsNotifications: false,
  marketingEmails: false,
  // Terms
  agreeToTerms: false,
  agreeToPrivacy: false,
  agreeToMarketing: false
});
  const errors = ref({});
  const touched = ref({});
  const isSubmitting = ref(false);
  const showAdvancedOptions = ref(false);
  const currentStep = ref(1);
  const totalSteps = ref(3);

// Validation rules
  // Validation rules
const validationRules = {
  firstName: {
    required: true,
    minLength: 2
  },
  lastName: {
    required: true,
    minLength: 2
  },
  email: {
    required: true,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  },
  phone: {
    required: false,
    pattern: /^\+?[\d\s-()]+$/
  },
  dateOfBirth: {
    required: true
  },
  companyName: {
    required: true,
    minLength: 2
  },
  // Only for business/enterprise
  taxId: {
    required: true
  },
  // Only for business/enterprise
  contactPerson: {
    required: true
  },
  // Only for enterprise
  agreeToTerms: {
    required: true
  },
  agreeToPrivacy: {
    required: true
  }
};

// Computed validation
  // Computed validation
const isValidStep1 = computed(() => {
  const requiredFields = ['firstName', 'lastName', 'email', 'dateOfBirth'];
  return requiredFields.every(field => formData.value[field] && !errors.value[field]);
});
  const isValidStep2 = computed(() => {
  if (formData.value.accountType === 'personal') return true;
  if (formData.value.accountType === 'business') {
    return formData.value.companyName && formData.value.taxId && !errors.value.companyName && !errors.value.taxId;
  }
  if (formData.value.accountType === 'enterprise') {
    return formData.value.companyName && formData.value.taxId && formData.value.contactPerson && !errors.value.companyName && !errors.value.taxId && !errors.value.contactPerson;
  }
  return false;
});
  const isValidStep3 = computed(() => {
  return formData.value.agreeToTerms && formData.value.agreeToPrivacy;
});
  const canSubmit = computed(() => {
  return isValidStep1.value && isValidStep2.value && isValidStep3.value && !isSubmitting.value;
});

  return Component((ui: LayoutBuilder) => {
    ui.Div({ className: "max-w-2xl mx-auto p-6" }, (ui: LayoutBuilder) => {
      ui.Div({ className: "bg-white rounded-lg shadow-lg p-8" }, (ui: LayoutBuilder) => {
      ui.Div({ className: "mb-8" }, (ui: LayoutBuilder) => {
      ui.Div({ className: "flex items-center justify-between mb-2" }, (ui: LayoutBuilder) => {
      ui.Span({ className: "text-sm font-medium" , text: watch([currentStep, totalSteps], () => `Step ${currentStep.value} of ${totalSteps.value}`)})
      ui.Span({ className: "text-sm text-gray-500" , text: watch([currentStep, totalSteps], () => `
              ${Math.round(currentStep.value / totalSteps.value * 100)}% Complete
            `)})
    })
      ui.Div({ className: "w-full bg-gray-200 rounded-full h-2" }, (ui: LayoutBuilder) => {
      ui.Div({ className: "bg-blue-500 h-2 rounded-full transition-all duration-300", style: {
  width: `${currentStep.value / totalSteps.value * 100}%`
} })
    })
    })
      ui.Form({}, (ui: LayoutBuilder) => {
      ui.When(watch([currentStep], () => currentStep.value === 1) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Div({ className: "space-y-6" }, (ui: LayoutBuilder) => {
      ui.Div({}, (ui: LayoutBuilder) => {
      ui.H2({ className: "text-2xl font-bold mb-2" , text: "Personal Information"})
      ui.P({ className: "text-gray-600" , text: "Tell us about yourself"})
    })
      ui.Div({ className: "grid grid-cols-1 md:grid-cols-2 gap-4" }, (ui: LayoutBuilder) => {
      ui.Div({}, (ui: LayoutBuilder) => {
      ui.Label({ className: "block text-sm font-medium mb-1" , text: "First Name *"})
      ui.Input({ type: "text", value: formData.value.firstName, className: `w-full border rounded-lg px-3 py-2 ${errors.value.firstName ? 'border-red-500' : 'border-gray-300'}`, placeholder: "Enter your first name", on: { change: e => formData.value.firstName = e.target.value } })
      ui.When(watch([errors], () => errors.value.firstName) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.P({ className: "text-red-500 text-sm mt-1" , value: errors.firstName})
      })
    })
      ui.Div({}, (ui: LayoutBuilder) => {
      ui.Label({ className: "block text-sm font-medium mb-1" , text: "Last Name *"})
      ui.Input({ type: "text", value: formData.value.lastName, className: `w-full border rounded-lg px-3 py-2 ${errors.value.lastName ? 'border-red-500' : 'border-gray-300'}`, placeholder: "Enter your last name", on: { change: e => formData.value.lastName = e.target.value } })
      ui.When(watch([errors], () => errors.value.lastName) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.P({ className: "text-red-500 text-sm mt-1" , value: errors.lastName})
      })
    })
    })
      ui.Div({}, (ui: LayoutBuilder) => {
      ui.Label({ className: "block text-sm font-medium mb-1" , text: "Email Address *"})
      ui.Input({ type: "email", value: formData.value.email, className: `w-full border rounded-lg px-3 py-2 ${errors.value.email ? 'border-red-500' : 'border-gray-300'}`, placeholder: "Enter your email address", on: { change: e => formData.value.email = e.target.value } })
      ui.When(watch([errors], () => errors.value.email) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.P({ className: "text-red-500 text-sm mt-1" , value: errors.email})
      })
    })
      ui.Div({}, (ui: LayoutBuilder) => {
      ui.Label({ className: "block text-sm font-medium mb-1" }, (ui: LayoutBuilder) => {
      ui.Text({ text: "Phone Number" })
      ui.Span({ className: "text-gray-500 text-sm ml-1" , text: "(optional)"})
    })
      ui.Input({ type: "tel", value: formData.value.phone, className: `w-full border rounded-lg px-3 py-2 ${errors.value.phone ? 'border-red-500' : 'border-gray-300'}`, placeholder: "Enter your phone number", on: { change: e => formData.value.phone = e.target.value } })
      ui.When(watch([errors], () => errors.value.phone) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.P({ className: "text-red-500 text-sm mt-1" , value: errors.phone})
      })
    })
      ui.Div({}, (ui: LayoutBuilder) => {
      ui.Label({ className: "block text-sm font-medium mb-1" , text: "Date of Birth *"})
      ui.Input({ type: "date", value: formData.value.dateOfBirth, className: `w-full border rounded-lg px-3 py-2 ${errors.value.dateOfBirth ? 'border-red-500' : 'border-gray-300'}`, on: { change: e => formData.value.dateOfBirth = e.target.value } })
      ui.When(watch([errors], () => errors.value.dateOfBirth) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.P({ className: "text-red-500 text-sm mt-1" , value: errors.dateOfBirth})
      })
    })
      ui.When(watch([isValidStep1, touched], () => !isValidStep1.value && Object.keys(touched.value).length > 0) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Div({ className: "bg-red-50 border border-red-200 rounded-lg p-4" }, (ui: LayoutBuilder) => {
      ui.H4({ className: "text-red-800 font-medium" , text: "Please fix the following errors:"})
      ui.Ul({ className: "text-red-700 text-sm mt-2 list-disc list-inside" }, (ui: LayoutBuilder) => {
      ui.When(watch([formData], () => !formData.value.firstName) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Li({text: "First name is required"})
      })
      ui.When(watch([formData], () => !formData.value.lastName) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Li({text: "Last name is required"})
      })
      ui.When(watch([formData], () => !formData.value.email) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Li({text: "Email address is required"})
      })
      ui.When(watch([formData], () => !formData.value.dateOfBirth) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Li({text: "Date of birth is required"})
      })
    })
    })
      })
    })
      })
      ui.When(watch([currentStep], () => currentStep.value === 2) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Div({ className: "space-y-6" }, (ui: LayoutBuilder) => {
      ui.Div({}, (ui: LayoutBuilder) => {
      ui.H2({ className: "text-2xl font-bold mb-2" , text: "Account Information"})
      ui.P({ className: "text-gray-600" , text: "Choose your account type"})
    })
      ui.Div({}, (ui: LayoutBuilder) => {
      ui.Label({ className: "block text-sm font-medium mb-3" , text: "Account Type *"})
      ui.Div({ className: "grid grid-cols-1 md:grid-cols-3 gap-4" }, (ui: LayoutBuilder) => {
      ui.Label({ className: `border-2 rounded-lg p-4 cursor-pointer transition-all ${formData.value.accountType === 'personal' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}` }, (ui: LayoutBuilder) => {
      ui.Input({ type: "radio", name: "accountType", value: "personal", checked: formData.value.accountType === 'personal', className: "sr-only", on: { change: e => formData.value.accountType = e.target.value } })
      ui.Div({ className: "text-center" }, (ui: LayoutBuilder) => {
      ui.Div({ className: "text-2xl mb-2" , text: "👤"})
      ui.Div({ className: "font-medium" , text: "Personal"})
      ui.Div({ className: "text-sm text-gray-500" , text: "Individual account"})
    })
    })
      ui.Label({ className: `border-2 rounded-lg p-4 cursor-pointer transition-all ${formData.value.accountType === 'business' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}` }, (ui: LayoutBuilder) => {
      ui.Input({ type: "radio", name: "accountType", value: "business", checked: formData.value.accountType === 'business', className: "sr-only", on: { change: e => formData.value.accountType = e.target.value } })
      ui.Div({ className: "text-center" }, (ui: LayoutBuilder) => {
      ui.Div({ className: "text-2xl mb-2" , text: "🏢"})
      ui.Div({ className: "font-medium" , text: "Business"})
      ui.Div({ className: "text-sm text-gray-500" , text: "Small to medium business"})
    })
    })
      ui.Label({ className: `border-2 rounded-lg p-4 cursor-pointer transition-all ${formData.value.accountType === 'enterprise' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}` }, (ui: LayoutBuilder) => {
      ui.Input({ type: "radio", name: "accountType", value: "enterprise", checked: formData.value.accountType === 'enterprise', className: "sr-only", on: { change: e => formData.value.accountType = e.target.value } })
      ui.Div({ className: "text-center" }, (ui: LayoutBuilder) => {
      ui.Div({ className: "text-2xl mb-2" , text: "🏭"})
      ui.Div({ className: "font-medium" , text: "Enterprise"})
      ui.Div({ className: "text-sm text-gray-500" , text: "Large organization"})
    })
    })
    })
    })
      ui.When(watch([formData], () => $if(formData.value.accountType === 'business' || formData.value.accountType === 'enterprise')) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Div({ className: "space-y-4 border-t pt-6" }, (ui: LayoutBuilder) => {
      ui.H3({ className: "text-lg font-medium" }, (ui: LayoutBuilder) => {
      ui.Text({ value: `${formData.value.accountType === 'business' ? 'Business' : 'Enterprise'}Information` })
    })
      ui.Div({}, (ui: LayoutBuilder) => {
      ui.Label({ className: "block text-sm font-medium mb-1" , text: "Company Name *"})
      ui.Input({ type: "text", value: formData.value.companyName, className: `w-full border rounded-lg px-3 py-2 ${errors.value.companyName ? 'border-red-500' : 'border-gray-300'}`, placeholder: "Enter your company name", on: { change: e => formData.value.companyName = e.target.value } })
      ui.When(watch([errors], () => errors.value.companyName) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.P({ className: "text-red-500 text-sm mt-1" , value: errors.companyName})
      })
    })
      ui.Div({ className: "grid grid-cols-1 md:grid-cols-2 gap-4" }, (ui: LayoutBuilder) => {
      ui.Div({}, (ui: LayoutBuilder) => {
      ui.Label({ className: "block text-sm font-medium mb-1" , text: "Tax ID *"})
      ui.Input({ type: "text", value: formData.value.taxId, className: `w-full border rounded-lg px-3 py-2 ${errors.value.taxId ? 'border-red-500' : 'border-gray-300'}`, placeholder: "Enter tax ID", on: { change: e => formData.value.taxId = e.target.value } })
      ui.When(watch([errors], () => errors.value.taxId) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.P({ className: "text-red-500 text-sm mt-1" , value: errors.taxId})
      })
    })
      ui.Div({}, (ui: LayoutBuilder) => {
      ui.Label({ className: "block text-sm font-medium mb-1" , text: "Industry"})
      ui.Select({ value: formData.value.industry, className: "w-full border border-gray-300 rounded-lg px-3 py-2", on: { change: e => formData.value.industry = e.target.value } }, (ui: LayoutBuilder) => {
      ui.Option({ value: "" , text: "Select industry"})
      ui.Option({ value: "technology" , text: "Technology"})
      ui.Option({ value: "healthcare" , text: "Healthcare"})
      ui.Option({ value: "finance" , text: "Finance"})
      ui.Option({ value: "retail" , text: "Retail"})
      ui.Option({ value: "manufacturing" , text: "Manufacturing"})
      ui.Option({ value: "other" , text: "Other"})
    })
    })
    })
      ui.When(watch([formData], () => formData.value.accountType === 'enterprise') as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Div({ className: "space-y-4 border-t pt-4" }, (ui: LayoutBuilder) => {
      ui.H4({ className: "font-medium" , text: "Enterprise Details"})
      ui.Div({ className: "grid grid-cols-1 md:grid-cols-2 gap-4" }, (ui: LayoutBuilder) => {
      ui.Div({}, (ui: LayoutBuilder) => {
      ui.Label({ className: "block text-sm font-medium mb-1" , text: "Primary Contact *"})
      ui.Input({ type: "text", value: formData.value.contactPerson, className: `w-full border rounded-lg px-3 py-2 ${errors.value.contactPerson ? 'border-red-500' : 'border-gray-300'}`, placeholder: "Contact person name", on: { change: e => formData.value.contactPerson = e.target.value } })
      ui.When(watch([errors], () => errors.value.contactPerson) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.P({ className: "text-red-500 text-sm mt-1" , value: errors.contactPerson})
      })
    })
      ui.Div({}, (ui: LayoutBuilder) => {
      ui.Label({ className: "block text-sm font-medium mb-1" , text: "Department"})
      ui.Input({ type: "text", value: formData.value.department, className: "w-full border border-gray-300 rounded-lg px-3 py-2", placeholder: "Department name", on: { change: e => formData.value.department = e.target.value } })
    })
    })
      ui.Div({ className: "grid grid-cols-1 md:grid-cols-2 gap-4" }, (ui: LayoutBuilder) => {
      ui.Div({}, (ui: LayoutBuilder) => {
      ui.Label({ className: "block text-sm font-medium mb-1" , text: "Employee Count"})
      ui.Select({ value: formData.value.employeeCount, className: "w-full border border-gray-300 rounded-lg px-3 py-2", on: { change: e => formData.value.employeeCount = e.target.value } }, (ui: LayoutBuilder) => {
      ui.Option({ value: "" , text: "Select range"})
      ui.Option({ value: "1-10" , text: "1-10"})
      ui.Option({ value: "11-50" , text: "11-50"})
      ui.Option({ value: "51-200" , text: "51-200"})
      ui.Option({ value: "201-1000" , text: "201-1000"})
      ui.Option({ value: "1000+" , text: "1000+"})
    })
    })
      ui.Div({}, (ui: LayoutBuilder) => {
      ui.Label({ className: "block text-sm font-medium mb-1" , text: "Annual Budget"})
      ui.Select({ value: formData.value.budget, className: "w-full border border-gray-300 rounded-lg px-3 py-2", on: { change: e => formData.value.budget = e.target.value } }, (ui: LayoutBuilder) => {
      ui.Option({ value: "" , text: "Select range"})
      ui.Option({ value: "<10k" , text: "Less than $10,000"})
      ui.Option({ value: "10k-50k" , text: "$10,000 - $50,000"})
      ui.Option({ value: "50k-100k" , text: "$50,000 - $100,000"})
      ui.Option({ value: "100k+" , text: "$100,000+"})
    })
    })
    })
    })
      })
    })
      })
      ui.When(watch([isValidStep2], () => !isValidStep2.value) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Div({ className: "bg-red-50 border border-red-200 rounded-lg p-4" }, (ui: LayoutBuilder) => {
      ui.H4({ className: "text-red-800 font-medium" , text: "Please complete required fields:"})
      ui.Ul({ className: "text-red-700 text-sm mt-2 list-disc list-inside" }, (ui: LayoutBuilder) => {
      ui.When(watch([formData], () => formData.value.accountType === 'enterprise' && !formData.value.contactPerson) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Li({text: "Primary contact is required"})
      })
    })
    })
      })
    })
      })
      ui.When(watch([currentStep], () => currentStep.value === 3) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Div({ className: "space-y-6" }, (ui: LayoutBuilder) => {
      ui.Div({}, (ui: LayoutBuilder) => {
      ui.H2({ className: "text-2xl font-bold mb-2" , text: "Preferences & Terms"})
      ui.P({ className: "text-gray-600" , text: "Customize your experience and agree to our terms"})
    })
      ui.Div({}, (ui: LayoutBuilder) => {
      ui.H3({ className: "text-lg font-medium mb-3" , text: "Communication Preferences"})
      ui.Div({ className: "space-y-3" }, (ui: LayoutBuilder) => {
      ui.Label({ className: "flex items-center" }, (ui: LayoutBuilder) => {
      ui.Input({ type: "checkbox", checked: formData.value.newsletter, className: "mr-3", on: { change: e => formData.value.newsletter = e.target.checked } })
      ui.Div({}, (ui: LayoutBuilder) => {
      ui.Div({ className: "font-medium" , text: "Newsletter"})
      ui.Div({ className: "text-sm text-gray-500" , text: "Receive our weekly newsletter with updates and tips"})
    })
    })
      ui.Label({ className: "flex items-center" }, (ui: LayoutBuilder) => {
      ui.Input({ type: "checkbox", checked: formData.value.smsNotifications, className: "mr-3", on: { change: e => formData.value.smsNotifications = e.target.checked } })
      ui.Div({}, (ui: LayoutBuilder) => {
      ui.Div({ className: "font-medium" , text: "SMS Notifications"})
      ui.Div({ className: "text-sm text-gray-500" , text: "Get important updates via text message"})
    })
    })
      ui.When(watch([formData], () => $if(formData.value.accountType === 'business' || formData.value.accountType === 'enterprise')) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Label({ className: "flex items-center" }, (ui: LayoutBuilder) => {
      ui.Input({ type: "checkbox", checked: formData.value.marketingEmails, className: "mr-3", on: { change: e => formData.value.marketingEmails = e.target.checked } })
      ui.Div({}, (ui: LayoutBuilder) => {
      ui.Div({ className: "font-medium" , text: "Marketing Communications"})
      ui.Div({ className: "text-sm text-gray-500" , text: "Receive information about business solutions and offers"})
    })
    })
      })
    })
    })
      ui.Div({}, (ui: LayoutBuilder) => {
      ui.Button({ type: "button", className: "flex items-center text-blue-600 hover:text-blue-800", on: { click: () => showAdvancedOptions.value = !showAdvancedOptions.value } }, (ui: LayoutBuilder) => {
      ui.Span({text: watch([showAdvancedOptions], () => `${showAdvancedOptions.value} ? '▼' : '▶'`)})
      ui.Span({ className: "ml-2" , text: "Advanced Options"})
    })
      ui.When(watch([showAdvancedOptions], () => showAdvancedOptions.value) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Div({ className: "mt-4 p-4 bg-gray-50 rounded-lg" }, (ui: LayoutBuilder) => {
      ui.Div({ className: "space-y-3" }, (ui: LayoutBuilder) => {
      ui.Div({}, (ui: LayoutBuilder) => {
      ui.Label({ className: "block text-sm font-medium mb-1" , text: "Data Processing Region"})
      ui.Select({ className: "w-full border border-gray-300 rounded-lg px-3 py-2" }, (ui: LayoutBuilder) => {
      ui.Option({ value: "us" , text: "United States"})
      ui.Option({ value: "eu" , text: "European Union"})
      ui.Option({ value: "asia" , text: "Asia Pacific"})
    })
    })
      ui.When(watch([formData], () => formData.value.accountType === 'enterprise') as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Div({}, (ui: LayoutBuilder) => {
      ui.Label({ className: "flex items-center" }, (ui: LayoutBuilder) => {
      ui.Input({ type: "checkbox", className: "mr-2" })
      ui.Span({ className: "text-sm" , text: "Enable single sign-on (SSO)"})
    })
    })
      })
    })
    })
      })
    })
      ui.Div({ className: "border-t pt-6" }, (ui: LayoutBuilder) => {
      ui.H3({ className: "text-lg font-medium mb-3" , text: "Terms and Conditions"})
      ui.Div({ className: "space-y-3" }, (ui: LayoutBuilder) => {
      ui.Label({ className: "flex items-start" }, (ui: LayoutBuilder) => {
      ui.Input({ type: "checkbox", checked: formData.value.agreeToTerms, className: "mr-3 mt-1", on: { change: e => formData.value.agreeToTerms = e.target.checked } })
      ui.Div({}, (ui: LayoutBuilder) => {
      ui.Span({ className: "font-medium" , text: "I agree to the Terms of Service *"})
      ui.Div({ className: "text-sm text-gray-500" }, (ui: LayoutBuilder) => {
      ui.Text({ text: "By checking this box, you agree to our" })
      ui.A({ href: "/terms", className: "text-blue-600 hover:underline ml-1" , text: "Terms of Service"})
    })
    })
    })
      ui.Label({ className: "flex items-start" }, (ui: LayoutBuilder) => {
      ui.Input({ type: "checkbox", checked: formData.value.agreeToPrivacy, className: "mr-3 mt-1", on: { change: e => formData.value.agreeToPrivacy = e.target.checked } })
      ui.Div({}, (ui: LayoutBuilder) => {
      ui.Span({ className: "font-medium" , text: "I agree to the Privacy Policy *"})
      ui.Div({ className: "text-sm text-gray-500" }, (ui: LayoutBuilder) => {
      ui.Text({ text: "By checking this box, you agree to our" })
      ui.A({ href: "/privacy", className: "text-blue-600 hover:underline ml-1" , text: "Privacy Policy"})
    })
    })
    })
      ui.When(watch([formData], () => formData.value.newsletter || formData.value.marketingEmails) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Label({ className: "flex items-start" }, (ui: LayoutBuilder) => {
      ui.Input({ type: "checkbox", checked: formData.value.agreeToMarketing, className: "mr-3 mt-1", on: { change: e => formData.value.agreeToMarketing = e.target.checked } })
      ui.Div({}, (ui: LayoutBuilder) => {
      ui.Span({ className: "font-medium" , text: "I consent to marketing communications"})
      ui.Div({ className: "text-sm text-gray-500" , text: "You can unsubscribe at any time"})
    })
    })
      })
    })
    })
      ui.When(watch([isValidStep3], () => !isValidStep3.value) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Div({ className: "bg-red-50 border border-red-200 rounded-lg p-4" }, (ui: LayoutBuilder) => {
      ui.H4({ className: "text-red-800 font-medium" , text: "Required agreements:"})
      ui.Ul({ className: "text-red-700 text-sm mt-2 list-disc list-inside" }, (ui: LayoutBuilder) => {
      ui.When(watch([formData], () => !formData.value.agreeToTerms) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Li({text: "You must agree to the Terms of Service"})
      })
      ui.When(watch([formData], () => !formData.value.agreeToPrivacy) as Ref<boolean>, (ui: LayoutBuilder) => {
        ui.Li({text: "You must agree to the Privacy Policy"})
      })
    })
    })
      })
    })
      })
      ui.Div({ className: "flex justify-between pt-8 border-t" }, (ui: LayoutBuilder) => {
      ui.Button({ type: "button", className: `px-6 py-2 border border-gray-300 rounded-lg ${currentStep.value === 1 ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`, disabled: currentStep.value === 1, on: { click: () => currentStep.value = Math.max(1, currentStep.value - 1) } , text: "Previous"})
      ui.Text({ value: `${currentStep.value < totalSteps.value ? <button type="button" onClick={() => currentStep.value = Math.min(totalSteps.value, currentStep.value + 1)} className={`px-6 py-2 rounded-lg ${currentStep.value === 1 && isValidStep1.value || currentStep.value === 2 && isValidStep2.value || currentStep.value === 3 && isValidStep3.value ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`} disabled={currentStep.value === 1 && !isValidStep1.value || currentStep.value === 2 && !isValidStep2.value || currentStep.value === 3 && !isValidStep3.value}>
                Next
              </button> : <button type="submit" className={`px-8 py-2 rounded-lg ${canSubmit.value ? 'bg-green-500 text-white hover:bg-green-600' : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`} disabled={!canSubmit.value}>
                {isSubmitting.value ? 'Creating Account...' : 'Create Account'}
              </button>}` })
    })
    })
    })
    })
  })
}
