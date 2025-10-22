// @page /form-validation
// Complex form with conditional validation and dynamic fields

import { ref, computed, type Ref } from 'auwla'

const formData = ref({
  // Personal info
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  dateOfBirth: '',
  
  // Account type
  accountType: 'personal', // 'personal', 'business', 'enterprise'
  
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
})

const errors = ref({})
const touched = ref({})
const isSubmitting = ref(false)
const showAdvancedOptions = ref(false)
const currentStep = ref(1)
const totalSteps = ref(3)

// Validation rules
const validationRules = {
  firstName: { required: true, minLength: 2 },
  lastName: { required: true, minLength: 2 },
  email: { required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  phone: { required: false, pattern: /^\+?[\d\s-()]+$/ },
  dateOfBirth: { required: true },
  companyName: { required: true, minLength: 2 }, // Only for business/enterprise
  taxId: { required: true }, // Only for business/enterprise
  contactPerson: { required: true }, // Only for enterprise
  agreeToTerms: { required: true },
  agreeToPrivacy: { required: true }
}

// Computed validation
const isValidStep1 = computed(() => {
  const requiredFields = ['firstName', 'lastName', 'email', 'dateOfBirth']
  return requiredFields.every(field => 
    formData.value[field] && !errors.value[field]
  )
})

const isValidStep2 = computed(() => {
  if (formData.value.accountType === 'personal') return true
  
  if (formData.value.accountType === 'business') {
    return formData.value.companyName && formData.value.taxId && !errors.value.companyName && !errors.value.taxId
  }
  
  if (formData.value.accountType === 'enterprise') {
    return formData.value.companyName && 
           formData.value.taxId && 
           formData.value.contactPerson && 
           !errors.value.companyName && 
           !errors.value.taxId && 
           !errors.value.contactPerson
  }
  
  return false
})

const isValidStep3 = computed(() => {
  return formData.value.agreeToTerms && formData.value.agreeToPrivacy
})

const canSubmit = computed(() => {
  return isValidStep1.value && isValidStep2.value && isValidStep3.value && !isSubmitting.value
})

export default function FormValidationPage() {
  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        {/* Progress indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Step {currentStep.value} of {totalSteps.value}</span>
            <span className="text-sm text-gray-500">
              {Math.round((currentStep.value / totalSteps.value) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep.value / totalSteps.value) * 100}%` }}
            ></div>
          </div>
        </div>

        <form>
          {/* Step 1: Personal Information */}
          {currentStep.value === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Personal Information</h2>
                <p className="text-gray-600">Tell us about yourself</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* First Name */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    First Name *
                  </label>
                  <input
                    type="text"
                    value={formData.value.firstName}
                    onChange={(e) => formData.value.firstName = e.target.value}
                    className={`w-full border rounded-lg px-3 py-2 ${
                      errors.value.firstName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your first name"
                  />
                  {errors.value.firstName && (
                    <p className="text-red-500 text-sm mt-1">{errors.value.firstName}</p>
                  )}
                </div>

                {/* Last Name */}
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    value={formData.value.lastName}
                    onChange={(e) => formData.value.lastName = e.target.value}
                    className={`w-full border rounded-lg px-3 py-2 ${
                      errors.value.lastName ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter your last name"
                  />
                  {errors.value.lastName && (
                    <p className="text-red-500 text-sm mt-1">{errors.value.lastName}</p>
                  )}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={formData.value.email}
                  onChange={(e) => formData.value.email = e.target.value}
                  className={`w-full border rounded-lg px-3 py-2 ${
                    errors.value.email ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your email address"
                />
                {errors.value.email && (
                  <p className="text-red-500 text-sm mt-1">{errors.value.email}</p>
                )}
              </div>

              {/* Phone (optional) */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Phone Number
                  <span className="text-gray-500 text-sm ml-1">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={formData.value.phone}
                  onChange={(e) => formData.value.phone = e.target.value}
                  className={`w-full border rounded-lg px-3 py-2 ${
                    errors.value.phone ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter your phone number"
                />
                {errors.value.phone && (
                  <p className="text-red-500 text-sm mt-1">{errors.value.phone}</p>
                )}
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Date of Birth *
                </label>
                <input
                  type="date"
                  value={formData.value.dateOfBirth}
                  onChange={(e) => formData.value.dateOfBirth = e.target.value}
                  className={`w-full border rounded-lg px-3 py-2 ${
                    errors.value.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                  }`}
                />
                {errors.value.dateOfBirth && (
                  <p className="text-red-500 text-sm mt-1">{errors.value.dateOfBirth}</p>
                )}
              </div>

              {/* Step 1 validation summary */}
              {!isValidStep1.value && Object.keys(touched.value).length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-red-800 font-medium">Please fix the following errors:</h4>
                  <ul className="text-red-700 text-sm mt-2 list-disc list-inside">
                    {!formData.value.firstName && <li>First name is required</li>}
                    {!formData.value.lastName && <li>Last name is required</li>}
                    {!formData.value.email && <li>Email address is required</li>}
                    {!formData.value.dateOfBirth && <li>Date of birth is required</li>}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Account Type & Business Info */}
          {currentStep.value === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Account Information</h2>
                <p className="text-gray-600">Choose your account type</p>
              </div>

              {/* Account Type Selection */}
              <div>
                <label className="block text-sm font-medium mb-3">Account Type *</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    formData.value.accountType === 'personal' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="accountType"
                      value="personal"
                      checked={formData.value.accountType === 'personal'}
                      onChange={(e) => formData.value.accountType = e.target.value}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="text-2xl mb-2">👤</div>
                      <div className="font-medium">Personal</div>
                      <div className="text-sm text-gray-500">Individual account</div>
                    </div>
                  </label>

                  <label className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    formData.value.accountType === 'business' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="accountType"
                      value="business"
                      checked={formData.value.accountType === 'business'}
                      onChange={(e) => formData.value.accountType = e.target.value}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="text-2xl mb-2">🏢</div>
                      <div className="font-medium">Business</div>
                      <div className="text-sm text-gray-500">Small to medium business</div>
                    </div>
                  </label>

                  <label className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                    formData.value.accountType === 'enterprise' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="accountType"
                      value="enterprise"
                      checked={formData.value.accountType === 'enterprise'}
                      onChange={(e) => formData.value.accountType = e.target.value}
                      className="sr-only"
                    />
                    <div className="text-center">
                      <div className="text-2xl mb-2">🏭</div>
                      <div className="font-medium">Enterprise</div>
                      <div className="text-sm text-gray-500">Large organization</div>
                    </div>
                  </label>
                </div>
              </div>

              {/* Business/Enterprise Fields */}
              {$if((formData.value.accountType === 'business' || formData.value.accountType === 'enterprise')) && (
                <div className="space-y-4 border-t pt-6">
                  <h3 className="text-lg font-medium">
                    {formData.value.accountType === 'business' ? 'Business' : 'Enterprise'} Information
                  </h3>

                  {/* Company Name */}
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      value={formData.value.companyName}
                      onChange={(e) => formData.value.companyName = e.target.value}
                      className={`w-full border rounded-lg px-3 py-2 ${
                        errors.value.companyName ? 'border-red-500' : 'border-gray-300'
                      }`}
                      placeholder="Enter your company name"
                    />
                    {errors.value.companyName && (
                      <p className="text-red-500 text-sm mt-1">{errors.value.companyName}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tax ID */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Tax ID *
                      </label>
                      <input
                        type="text"
                        value={formData.value.taxId}
                        onChange={(e) => formData.value.taxId = e.target.value}
                        className={`w-full border rounded-lg px-3 py-2 ${
                          errors.value.taxId ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter tax ID"
                      />
                      {errors.value.taxId && (
                        <p className="text-red-500 text-sm mt-1">{errors.value.taxId}</p>
                      )}
                    </div>

                    {/* Industry */}
                    <div>
                      <label className="block text-sm font-medium mb-1">
                        Industry
                      </label>
                      <select
                        value={formData.value.industry}
                        onChange={(e) => formData.value.industry = e.target.value}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      >
                        <option value="">Select industry</option>
                        <option value="technology">Technology</option>
                        <option value="healthcare">Healthcare</option>
                        <option value="finance">Finance</option>
                        <option value="retail">Retail</option>
                        <option value="manufacturing">Manufacturing</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Enterprise-specific fields */}
                  {formData.value.accountType === 'enterprise' && (
                    <div className="space-y-4 border-t pt-4">
                      <h4 className="font-medium">Enterprise Details</h4>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Contact Person */}
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Primary Contact *
                          </label>
                          <input
                            type="text"
                            value={formData.value.contactPerson}
                            onChange={(e) => formData.value.contactPerson = e.target.value}
                            className={`w-full border rounded-lg px-3 py-2 ${
                              errors.value.contactPerson ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Contact person name"
                          />
                          {errors.value.contactPerson && (
                            <p className="text-red-500 text-sm mt-1">{errors.value.contactPerson}</p>
                          )}
                        </div>

                        {/* Department */}
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Department
                          </label>
                          <input
                            type="text"
                            value={formData.value.department}
                            onChange={(e) => formData.value.department = e.target.value}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            placeholder="Department name"
                          />
                        </div>
                      </div>

                      {/* Employee Count & Budget */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Employee Count
                          </label>
                          <select
                            value={formData.value.employeeCount}
                            onChange={(e) => formData.value.employeeCount = e.target.value}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                          >
                            <option value="">Select range</option>
                            <option value="1-10">1-10</option>
                            <option value="11-50">11-50</option>
                            <option value="51-200">51-200</option>
                            <option value="201-1000">201-1000</option>
                            <option value="1000+">1000+</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-sm font-medium mb-1">
                            Annual Budget
                          </label>
                          <select
                            value={formData.value.budget}
                            onChange={(e) => formData.value.budget = e.target.value}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2"
                          >
                            <option value="">Select range</option>
                            <option value="<10k">Less than $10,000</option>
                            <option value="10k-50k">$10,000 - $50,000</option>
                            <option value="50k-100k">$50,000 - $100,000</option>
                            <option value="100k+">$100,000+</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step 2 validation */}
              {!isValidStep2.value && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-red-800 font-medium">Please complete required fields:</h4>
                  <ul className="text-red-700 text-sm mt-2 list-disc list-inside">
                    {(formData.value.accountType === 'business' || formData.value.accountType === 'enterprise') && (
                      <>
                        {!formData.value.companyName && <li>Company name is required</li>}
                        {!formData.value.taxId && <li>Tax ID is required</li>}
                      </>
                    )}
                    {formData.value.accountType === 'enterprise' && !formData.value.contactPerson && (
                      <li>Primary contact is required</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Step 3: Preferences & Terms */}
          {currentStep.value === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">Preferences & Terms</h2>
                <p className="text-gray-600">Customize your experience and agree to our terms</p>
              </div>

              {/* Communication Preferences */}
              <div>
                <h3 className="text-lg font-medium mb-3">Communication Preferences</h3>
                <div className="space-y-3">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.value.newsletter}
                      onChange={(e) => formData.value.newsletter = e.target.checked}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">Newsletter</div>
                      <div className="text-sm text-gray-500">Receive our weekly newsletter with updates and tips</div>
                    </div>
                  </label>

                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.value.smsNotifications}
                      onChange={(e) => formData.value.smsNotifications = e.target.checked}
                      className="mr-3"
                    />
                    <div>
                      <div className="font-medium">SMS Notifications</div>
                      <div className="text-sm text-gray-500">Get important updates via text message</div>
                    </div>
                  </label>

                  {/* Marketing emails - only for business/enterprise */}
                  {$if((formData.value.accountType === 'business' || formData.value.accountType === 'enterprise')) && (
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.value.marketingEmails}
                        onChange={(e) => formData.value.marketingEmails = e.target.checked}
                        className="mr-3"
                      />
                      <div>
                        <div className="font-medium">Marketing Communications</div>
                        <div className="text-sm text-gray-500">Receive information about business solutions and offers</div>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* Advanced Options */}
              <div>
                <button
                  type="button"
                  onClick={() => showAdvancedOptions.value = !showAdvancedOptions.value}
                  className="flex items-center text-blue-600 hover:text-blue-800"
                >
                  <span>{showAdvancedOptions.value ? '▼' : '▶'}</span>
                  <span className="ml-2">Advanced Options</span>
                </button>

                {showAdvancedOptions.value && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium mb-1">Data Processing Region</label>
                        <select className="w-full border border-gray-300 rounded-lg px-3 py-2">
                          <option value="us">United States</option>
                          <option value="eu">European Union</option>
                          <option value="asia">Asia Pacific</option>
                        </select>
                      </div>

                      {/* Enterprise-only advanced options */}
                      {formData.value.accountType === 'enterprise' && (
                        <div>
                          <label className="flex items-center">
                            <input type="checkbox" className="mr-2" />
                            <span className="text-sm">Enable single sign-on (SSO)</span>
                          </label>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Terms and Conditions */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-3">Terms and Conditions</h3>
                <div className="space-y-3">
                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={formData.value.agreeToTerms}
                      onChange={(e) => formData.value.agreeToTerms = e.target.checked}
                      className="mr-3 mt-1"
                    />
                    <div>
                      <span className="font-medium">I agree to the Terms of Service *</span>
                      <div className="text-sm text-gray-500">
                        By checking this box, you agree to our 
                        <a href="/terms" className="text-blue-600 hover:underline ml-1">Terms of Service</a>
                      </div>
                    </div>
                  </label>

                  <label className="flex items-start">
                    <input
                      type="checkbox"
                      checked={formData.value.agreeToPrivacy}
                      onChange={(e) => formData.value.agreeToPrivacy = e.target.checked}
                      className="mr-3 mt-1"
                    />
                    <div>
                      <span className="font-medium">I agree to the Privacy Policy *</span>
                      <div className="text-sm text-gray-500">
                        By checking this box, you agree to our 
                        <a href="/privacy" className="text-blue-600 hover:underline ml-1">Privacy Policy</a>
                      </div>
                    </div>
                  </label>

                  {/* Marketing consent - conditional */}
                  {(formData.value.newsletter || formData.value.marketingEmails) && (
                    <label className="flex items-start">
                      <input
                        type="checkbox"
                        checked={formData.value.agreeToMarketing}
                        onChange={(e) => formData.value.agreeToMarketing = e.target.checked}
                        className="mr-3 mt-1"
                      />
                      <div>
                        <span className="font-medium">I consent to marketing communications</span>
                        <div className="text-sm text-gray-500">
                          You can unsubscribe at any time
                        </div>
                      </div>
                    </label>
                  )}
                </div>
              </div>

              {/* Step 3 validation */}
              {!isValidStep3.value && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <h4 className="text-red-800 font-medium">Required agreements:</h4>
                  <ul className="text-red-700 text-sm mt-2 list-disc list-inside">
                    {!formData.value.agreeToTerms && <li>You must agree to the Terms of Service</li>}
                    {!formData.value.agreeToPrivacy && <li>You must agree to the Privacy Policy</li>}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex justify-between pt-8 border-t">
            <button
              type="button"
              onClick={() => currentStep.value = Math.max(1, currentStep.value - 1)}
              className={`px-6 py-2 border border-gray-300 rounded-lg ${
                currentStep.value === 1 
                  ? 'text-gray-400 cursor-not-allowed' 
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
              disabled={currentStep.value === 1}
            >
              Previous
            </button>

            {currentStep.value < totalSteps.value ? (
              <button
                type="button"
                onClick={() => currentStep.value = Math.min(totalSteps.value, currentStep.value + 1)}
                className={`px-6 py-2 rounded-lg ${
                  (currentStep.value === 1 && isValidStep1.value) ||
                  (currentStep.value === 2 && isValidStep2.value) ||
                  (currentStep.value === 3 && isValidStep3.value)
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                disabled={
                  (currentStep.value === 1 && !isValidStep1.value) ||
                  (currentStep.value === 2 && !isValidStep2.value) ||
                  (currentStep.value === 3 && !isValidStep3.value)
                }
              >
                Next
              </button>
            ) : (
              <button
                type="submit"
                className={`px-8 py-2 rounded-lg ${
                  canSubmit.value
                    ? 'bg-green-500 text-white hover:bg-green-600'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                disabled={!canSubmit.value}
              >
                {isSubmitting.value ? 'Creating Account...' : 'Create Account'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}