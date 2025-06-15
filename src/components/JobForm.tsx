import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/components/ui/use-toast';
import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Phone, MapPin, User, LocateFixed } from 'lucide-react';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';

const jobFormSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  jobDate: z.string().min(1, 'Job date is required'),
  jobTime: z.string().min(1, 'Job time is required'),
  quote: z.number().min(0.01, 'Quote must be a positive number'),
  phone: z.string().min(1, 'Phone number is required')
    .regex(/^\(?([0-9]{3})\)?[-. ]?([0-9]{3})[-. ]?([0-9]{4})$/, 'Invalid phone number format'),
  description: z.string().optional(),
  scheduledBy: z.enum(['Will Griffioen', 'Sean Baird'], { errorMap: () => ({ message: 'Please select who scheduled the job.'}) }),
});

type JobFormData = z.infer<typeof jobFormSchema>;

interface JobFormProps {
  initialQuote: number;
}

const getDefaultDate = () => {
  return undefined;
};

const generateTimeSlots = () => {
  const slots = [];
  for (let h = 8; h < 20; h++) {
    for (let m = 0; m < 60; m += 30) {
      const displayHour = h % 12 === 0 ? 12 : h % 12;
      let ampm = h < 12 || h === 24 ? 'AM' : 'PM';
      if (h === 12) ampm = 'PM';
      const formattedMinute = m.toString().padStart(2, '0');
      const displayTime = `${displayHour}:${formattedMinute} ${ampm}`;
      const valueTime = `${h.toString().padStart(2, '0')}:${formattedMinute}`;
      slots.push({ label: displayTime, value: valueTime });
    }
  }
  return slots;
};

const timeSlots = generateTimeSlots();

export function JobForm({ initialQuote }: JobFormProps) {
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, touchedFields, isSubmitted },
  } = useForm<JobFormData>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      name: '',
      address: '',
      jobDate: getDefaultDate(),
      jobTime: '08:00',
      quote: undefined,
      phone: '',
      description: '',
      scheduledBy: undefined,
    },
  });

  const [formattedPhone, setFormattedPhone] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [locating, setLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [descOptions, setDescOptions] = useState<{ [key: string]: boolean }>({
    Outside: false,
    Inside: false,
    Screens: false,
  });
  const [descError, setDescError] = useState<string | null>(null);
  const [additionalNotes, setAdditionalNotes] = useState('');

  // Phone formatting handler
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let digits = e.target.value.replace(/\D/g, '');
    if (digits.length > 10) digits = digits.slice(0, 10);
    let formatted = '';
    if (digits.length > 0) {
      formatted = '(' + digits.slice(0, 3);
    }
    if (digits.length >= 4) {
      formatted += ') ' + digits.slice(3, 6);
    }
    if (digits.length >= 7) {
      formatted += '-' + digits.slice(6, 10);
    }
    setFormattedPhone(formatted);
    setValue('phone', digits, { shouldValidate: true });
  };

  // Sync selectedDate with form state
  useEffect(() => {
    if (selectedDate) {
      setValue('jobDate', selectedDate.toISOString().split('T')[0], { shouldValidate: true });
    } else {
      setValue('jobDate', '', { shouldValidate: true });
    }
  }, [selectedDate, setValue]);

  // Autofill address using Google Maps Geocoding API
  const handleUseLocation = async () => {
    setLocating(true);
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setLocating(false);
      return;
    }
    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
        const response = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`);
        const data = await response.json();
        if (data.status === 'OK' && data.results.length > 0) {
          const address = data.results[0].formatted_address;
          setValue('address', address, { shouldValidate: true });
        } else {
          setLocationError('Unable to retrieve address from location.');
        }
      } catch (err) {
        setLocationError('Failed to fetch address.');
      } finally {
        setLocating(false);
      }
    }, (error) => {
      setLocationError('Unable to get your location.');
      setLocating(false);
    });
  };

  // Handle checkbox changes for description options
  const handleDescOptionChange = (option: string) => {
    setDescOptions((prev) => ({ ...prev, [option]: !prev[option] }));
  };

  // Handle additional notes change
  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setAdditionalNotes(e.target.value);
  };

  const onSubmit = async (data: JobFormData) => {
    // Combine selected options and notes into a single description string
    const selectedOptions = Object.keys(descOptions).filter((key) => descOptions[key]);
    if (selectedOptions.length === 0) {
      setDescError('Please select at least one option.');
      return;
    } else {
      setDescError(null);
    }
    let combinedDescription = '';
    if (selectedOptions.length > 0) {
      combinedDescription += `Selected: ${selectedOptions.join(', ')}`;
    }
    if (additionalNotes.trim()) {
      if (combinedDescription) combinedDescription += '\n';
      combinedDescription += `Notes: ${additionalNotes.trim()}`;
    }
    // Set the combined description in the form data
    data.description = combinedDescription;
    try {
      const response = await fetch('/api/create-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to create job. Please check details and try again.');
      }

      toast({
        title: 'Success!',
        description: `Job created in Notion! (ID: ${result.notionPageId || 'N/A'})`,
      });

      reset();
      setValue('quote', undefined as any);
      setDescOptions({ Outside: false, Inside: false, Screens: false });
      setAdditionalNotes('');

    } catch (error: any) {
      console.error("Form submission error:", error);
      toast({
        title: 'Error Creating Job',
        description: error.message || 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const selectedScheduler = watch('scheduledBy');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-3xl mx-auto space-y-8 p-0">
      <h2 className="text-3xl font-bold text-center text-blue-900 mb-4">Create New Job</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Service Info Section */}
        <div className="rounded-2xl shadow p-6 bg-blue-50 flex flex-col space-y-4 col-span-1">
          <h3 className="text-xl font-semibold text-blue-800 mb-2">Service Info</h3>
          <div className="flex flex-col gap-4 w-full">
            <label htmlFor="quote" className="block text-md font-semibold text-gray-800 mb-1 flex items-center gap-2">
              <span>Quote</span>
            </label>
            <div className="relative rounded-lg shadow-sm flex items-center">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <span className="text-gray-500 text-2xl font-bold">$</span>
              </div>
              <input
                type="number"
                id="quote"
                {...register('quote', { valueAsNumber: true })}
                step="0.01"
                className="block w-full rounded-lg border border-gray-300 py-4 pl-12 pr-4 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-3xl font-bold bg-white"
                placeholder="250"
                aria-label="Quote"
              />
            </div>
            {errors.quote && <p className="mt-1 text-sm text-red-600">{errors.quote.message}</p>}
            <label className="block text-md font-semibold text-gray-800 mb-2 mt-2">Scheduled By</label>
            <div className="flex flex-row gap-3 w-full">
              {(['Will Griffioen', 'Sean Baird'] as const).map((scheduler) => (
                <button
                  type="button"
                  key={scheduler}
                  onClick={() => setValue('scheduledBy', scheduler, { shouldValidate: true })}
                  className={`w-full px-4 py-4 border rounded-lg text-lg font-medium transition-all duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500
                    ${selectedScheduler === scheduler 
                      ? 'bg-blue-600 text-white border-blue-700 shadow-md' 
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50 shadow-sm'}`}
                  aria-pressed={selectedScheduler === scheduler}
                >
                  {scheduler}
                </button>
              ))}
            </div>
            {errors.scheduledBy && <p className="mt-2 text-sm text-red-600">{errors.scheduledBy.message}</p>}
          </div>
        </div>
        {/* Client Info Section */}
        <div className="rounded-2xl shadow p-6 bg-blue-50 flex flex-col space-y-4 col-span-1">
          <h3 className="text-xl font-semibold text-blue-800 mb-2">Client Info</h3>
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-md font-semibold text-gray-800 mb-1 flex items-center gap-2">
              <User className="w-4 h-4 text-gray-400" />
              <span>Name</span>
            </label>
            <input
              type="text"
              id="name"
              {...register('name')}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
              autoComplete="name"
              placeholder="John Smith"
              aria-label="Name"
            />
            {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>}
          </div>
          {/* Phone */}
          <div>
            <label htmlFor="phone" className="block text-md font-semibold text-gray-800 mb-1 flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400" />
              <span>Phone</span>
            </label>
            <input
              type="tel"
              id="phone"
              value={formattedPhone}
              onChange={handlePhoneChange}
              className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
              autoComplete="tel"
              placeholder="(555) 123-4567"
              aria-label="Phone number"
            />
            {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>}
          </div>
          {/* Address */}
          <div>
            <label htmlFor="address" className="block text-md font-semibold text-gray-800 mb-1 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-400" />
              <span>Address</span>
            </label>
            <div className="flex gap-2 items-center">
              <input
                type="text"
                id="address"
                {...register('address')}
                className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                autoComplete="street-address"
                placeholder="123 Main St, Anytown, USA"
                aria-label="Address"
              />
              <button
                type="button"
                onClick={handleUseLocation}
                className="mt-1 flex items-center justify-center px-3 py-2 rounded-lg bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
                disabled={locating}
                aria-label="Use my location"
              >
                {locating ? (
                  <svg className="animate-spin h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                ) : (
                  <LocateFixed className="h-5 w-5" />
                )}
              </button>
            </div>
            {locationError && <p className="mt-1 text-sm text-red-600">{locationError}</p>}
            {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>}
          </div>
        </div>
        {/* Job Details Section (spans both columns) */}
        <div className="rounded-2xl shadow p-6 bg-blue-50 flex flex-col space-y-4 col-span-1 md:col-span-2">
          <h3 className="text-xl font-semibold text-blue-800 mb-2">Job Details</h3>
          <div className="flex flex-row gap-4 w-full items-center">
            {/* Job Date */}
            <div className="flex-1 flex flex-col justify-center">
              <label htmlFor="jobDate" className="flex items-center gap-2 text-md font-semibold text-gray-800 mb-2">
                <CalendarIcon className="w-5 h-5 text-gray-400" />
                <span>Job Date</span>
              </label>
              <div className="relative flex items-center">
                <DatePicker
                  id="jobDate"
                  selected={selectedDate}
                  onChange={(date) => setSelectedDate(date)}
                  className="block w-full rounded-lg border border-gray-300 px-3 py-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base appearance-none"
                  placeholderText="Select a date"
                  aria-label="Job date"
                  dateFormat="EEEE, MMMM d"
                  popperPlacement="bottom"
                  showPopperArrow={false}
                  autoComplete="off"
                  wrapperClassName="w-full"
                />
                <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
              </div>
              {((touchedFields.jobDate || isSubmitted) && errors.jobDate) && (
                <p className="mt-1 text-sm text-red-600">{errors.jobDate.message}</p>
              )}
            </div>
            {/* Job Time */}
            <div className="flex-1 flex flex-col justify-center">
              <label htmlFor="jobTime" className="block text-md font-semibold text-gray-800 mb-2">Job Time</label>
              <select
                id="jobTime"
                {...register('jobTime')}
                className="block w-full rounded-lg border border-gray-300 px-3 py-3 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base"
                aria-label="Job time"
              >
                {timeSlots.map((slot) => (
                  <option key={slot.value} value={slot.value}>
                    {slot.label}
                  </option>
                ))}
              </select>
              {errors.jobTime && <p className="mt-1 text-sm text-red-600">{errors.jobTime.message}</p>}
            </div>
          </div>
          {/* Description Options and Notes */}
          <div className="flex flex-col space-y-3 mt-2">
            <label className="block text-md font-semibold text-gray-800 mb-1">Description</label>
            <div className="flex flex-col gap-2 mb-1 w-full px-8">
              {['Outside', 'Inside', 'Screens'].map((option) => (
                <label
                  key={option}
                  htmlFor={`desc-${option}`}
                  className="flex items-center gap-3 text-base font-semibold cursor-pointer select-none min-h-[48px] rounded-lg px-2 transition-colors touch-manipulation active:bg-blue-100"
                >
                  <input
                    id={`desc-${option}`}
                    type="checkbox"
                    checked={descOptions[option]}
                    onChange={() => handleDescOptionChange(option)}
                    className="accent-blue-600 w-6 h-6 rounded transition-colors duration-150"
                  />
                  {option}
                </label>
              ))}
            </div>
            {descError && <p className="text-sm text-red-600 mb-1">{descError}</p>}
            <textarea
              id="additionalNotes"
              value={additionalNotes}
              onChange={handleNotesChange}
              rows={3}
              className="block w-full rounded-lg border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-base mt-6"
              placeholder="Additional notes (optional)"
              aria-label="Additional notes"
            />
          </div>
        </div>
      </div>
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full flex items-center justify-center bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition duration-150 ease-in-out disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 mt-4"
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Creating Job...
          </>
        ) : 'Create Job'}
      </button>
    </form>
  );
} 