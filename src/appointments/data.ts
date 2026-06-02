export interface TeamMember {
  id: string
  name: string
  role: string
  color: string
  bg: string
  email?: string
  linkedCalendar?: string
  isUser?: boolean
}

export type EventType = string

export type DayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat'

export interface BookingLinkTimeSlot {
  startTime: string
  endTime: string
}

export interface BookingLink {
  id: string
  name: string
  duration: string
  // Extended scheduling fields
  location?: 'online' | 'phone' | 'in-person'
  locationOnlineMode?: 'my-link' | 'attendee-link'
  preInstructions?: string
  daysInAdvance?: number
  bufferBefore?: string
  bufferAfter?: string
  advanceNoticeValue?: number
  advanceNoticeUnit?: 'minutes' | 'hours' | 'days'
  availabilityByDay?: Partial<Record<DayKey, BookingLinkTimeSlot[]>>
  memberIds?: string[]
  isNew?: boolean
}

export const DEFAULT_BOOKING_LINKS: BookingLink[] = [
  { id: 'bl1', name: 'AC Service',         duration: '60 min', memberIds: ['m2'] },
  { id: 'bl2', name: 'Heating Repair',     duration: '90 min', memberIds: ['m1'] },
  { id: 'bl3', name: 'New System Install', duration: '4 hr',   memberIds: ['m1', 'm3'] },
  { id: 'bl4', name: 'Annual Inspection',  duration: '45 min', memberIds: ['m2'] },
  { id: 'bl5', name: 'Emergency Service',  duration: '30 min', isNew: true },
  { id: 'bl6', name: 'Team Meeting',       duration: '30 min', memberIds: ['m5'] },
]

export interface PopoverFields {
  time: boolean
  client: boolean
  address: boolean
  type: boolean
  notes: boolean
  members: boolean
}

export const DEFAULT_POPOVER_FIELDS: PopoverFields = {
  time: true,
  client: true,
  address: true,
  type: true,
  notes: true,
  members: true,
}

export interface CalendarEvent {
  id: string
  title: string
  date: string
  startTime?: string
  endTime?: string
  allDay: boolean
  type: EventType
  memberIds: string[]
  service?: string
  clientId?: string
  clientName?: string
  clientPhone?: string
  clientAddress?: string
  notes?: string
}

export interface Contact {
  id: string
  name: string
  phone: string
  address: string
}

export const seedContacts: Contact[] = [
  { id: 'hc1',  name: 'Margaret Holloway', phone: '(512) 334-7821', address: '4821 Brushy Creek Rd, Cedar Park TX' },
  { id: 'hc2',  name: 'Derek Okafor',      phone: '(512) 889-2204', address: '2310 Oltorf St, Austin TX' },
  { id: 'hc3',  name: 'Sofia Reyes',       phone: '(737) 201-5563', address: '901 Tillery St, Austin TX' },
  { id: 'hc4',  name: 'Tyler Nguyen',      phone: '(512) 447-9930', address: '5504 Manchaca Rd, Austin TX' },
  { id: 'hc5',  name: 'Priya Chandran',    phone: '(737) 654-0012', address: '1802 Barton Hills Dr, Austin TX' },
  { id: 'hc6',  name: 'James Whitfield',   phone: '(512) 770-3341', address: '7401 Burnet Rd, Austin TX' },
  { id: 'hc7',  name: 'Linda Castillo',    phone: '(512) 203-8847', address: '3109 Decker Lake Rd, Austin TX' },
  { id: 'hc8',  name: 'Raymond Foster',    phone: '(737) 312-6609', address: '2205 Lake Austin Blvd, Austin TX' },
  { id: 'hc9',  name: 'Aisha Obi',         phone: '(512) 558-4423', address: '4800 Duval St, Austin TX' },
  { id: 'hc10', name: 'Harold Simmons',    phone: '(737) 489-1175', address: '6212 Bluff Springs Rd, Austin TX' },
  { id: 'hc11', name: 'Carol Jennings',    phone: '(512) 921-7700', address: '900 Industrial Blvd, Austin TX' },
  { id: 'hc12', name: 'Ben Kowalski',      phone: '(737) 600-2281', address: '3505 Far West Blvd, Austin TX' },
  { id: 'hc13', name: 'Megan Torres',      phone: '(512) 348-9962', address: '1104 E 51st St, Austin TX' },
  { id: 'hc14', name: 'Oliver Grant',      phone: '(737) 719-5540', address: '8810 N Lamar Blvd, Austin TX' },
  { id: 'hc15', name: 'Dana Schwartz',     phone: '(512) 482-3317', address: '2711 Pecos St, Austin TX' },
]

export const teamMembers: TeamMember[] = [
  { id: 'm1', name: 'Mike Torres',    role: 'Lead Technician',  color: '#1a73e8', bg: '#e8f0fe', email: 'mike.torres@summithvac.com',   linkedCalendar: 'mike.torres@summithvac.com',  isUser: true },
  { id: 'm2', name: 'Sarah Kim',      role: 'HVAC Technician',  color: '#1e8e3e', bg: '#e6f4ea', email: 'sarah.kim@summithvac.com',     linkedCalendar: 'sarah.kim@summithvac.com',    isUser: true },
  { id: 'm3', name: 'Dave Patel',     role: 'HVAC Technician',  color: '#7c3aed', bg: '#ede9fe', email: 'dave.patel@summithvac.com' },
  { id: 'm4', name: 'Lisa Chen',      role: 'Dispatcher',       color: '#d93025', bg: '#fce8e6', email: 'lisa.chen@summithvac.com' },
  { id: 'm5', name: 'Jordan Blake',   role: 'Service Manager',  color: '#00897b', bg: '#e0f2f1', email: 'jordan.blake@summithvac.com',  linkedCalendar: 'jordan.blake@summithvac.com', isUser: true },
]

function getCurrentWeekDates(): string[] {
  const today = new Date()
  const day = today.getDay()
  const offset = day === 0 ? -6 : 1 - day
  const monday = new Date(today)
  monday.setDate(today.getDate() + offset)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d.toISOString().slice(0, 10)
  })
}

const [mon, tue, wed, thu, fri, sat, sun] = getCurrentWeekDates()

export const seedEvents: CalendarEvent[] = [
  { id: 'e1',  title: 'Morning Dispatch Huddle', date: mon, startTime: '07:30', endTime: '08:00', allDay: false, type: 'Team Meeting',         memberIds: ['m1','m2','m3','m4','m5'], notes: 'Review daily job schedule, assign routes, flag any parts on back-order.' },
  { id: 'e2',  title: 'AC Tune-Up',              date: mon, startTime: '09:00', endTime: '10:00', allDay: false, type: 'AC Service',           memberIds: ['m2'],      service: 'Seasonal AC Tune-Up',        clientId: 'hc1',  clientName: 'Margaret Holloway', clientPhone: '(512) 334-7821', clientAddress: '4821 Brushy Creek Rd, Cedar Park TX 78613', notes: 'Annual maintenance. Check refrigerant level, clean coils, inspect capacitor. Filter replaced last visit.' },
  { id: 'e3',  title: 'Furnace Replacement',     date: mon, startTime: '10:00', endTime: '13:00', allDay: false, type: 'New System Install',   memberIds: ['m1','m3'], service: 'Gas Furnace Install',         clientId: 'hc2',  clientName: 'Derek Okafor',      clientPhone: '(512) 889-2204', clientAddress: '2310 Oltorf St, Austin TX 78741',            notes: 'Replace existing 80k BTU unit with Carrier 96% AFUE. Confirm flue liner condition before install.' },
  { id: 'e4',  title: 'Thermostat Upgrade',      date: mon, startTime: '14:00', endTime: '15:00', allDay: false, type: 'AC Service',           memberIds: ['m2'],      service: 'Smart Thermostat Install',   clientId: 'hc3',  clientName: 'Sofia Reyes',       clientPhone: '(737) 201-5563', clientAddress: '901 Tillery St, Austin TX 78702',            notes: 'Installing Ecobee SmartThermostat. Customer on 3-zone system — confirm compatibility before arrival.' },
  { id: 'e5',  title: 'No-Heat Service Call',    date: tue, startTime: '08:00', endTime: '09:30', allDay: false, type: 'Heating Repair',       memberIds: ['m1'],      service: 'Heating Diagnostic',         clientId: 'hc4',  clientName: 'Tyler Nguyen',      clientPhone: '(512) 447-9930', clientAddress: '5504 Manchaca Rd, Austin TX 78745',          notes: 'Customer reports no heat overnight. Likely ignitor or flame sensor. Bring common parts.' },
  { id: 'e6',  title: 'Duct Cleaning',           date: tue, startTime: '09:00', endTime: '11:30', allDay: false, type: 'AC Service',           memberIds: ['m3','m2'], service: 'Full Duct Cleaning',          clientId: 'hc5',  clientName: 'Priya Chandran',    clientPhone: '(737) 654-0012', clientAddress: '1802 Barton Hills Dr, Austin TX 78704',      notes: 'Whole-home duct cleaning, 2,400 sq ft. Customer has pet allergies — sanitizer treatment included.' },
  { id: 'e7',  title: 'New System Consultation', date: tue, startTime: '14:00', endTime: '14:45', allDay: false, type: 'Annual Inspection',    memberIds: ['m5'],      service: 'Free In-Home Estimate',      clientId: 'hc6',  clientName: 'James Whitfield',   clientPhone: '(512) 770-3341', clientAddress: '7401 Burnet Rd, Austin TX 78757',            notes: 'Older Rheem system, 18 years old. Evaluate for full replacement. Measure home, quote 3 options.' },
  { id: 'e8',  title: 'Refrigerant Recharge',    date: tue, startTime: '15:30', endTime: '16:30', allDay: false, type: 'AC Service',           memberIds: ['m2','m4'], service: 'R-410A Recharge',             clientId: 'hc7',  clientName: 'Linda Castillo',    clientPhone: '(512) 203-8847', clientAddress: '3109 Decker Lake Rd, Austin TX 78724',       notes: 'Low on refrigerant. Check for leak source before recharging. EPA 608 cert required on site.' },
  { id: 'e9',  title: 'Team Training Day',       date: wed, allDay: true,                         type: 'Team Meeting',         memberIds: ['m1','m2','m3','m4','m5'], notes: 'Annual product training with Carrier rep. Office closed to service calls 8 AM – 12 PM.' },
  { id: 'e10', title: 'Heat Pump Install',       date: wed, startTime: '08:00', endTime: '12:00', allDay: false, type: 'New System Install',   memberIds: ['m1','m3'], service: 'Heat Pump System Install',    clientId: 'hc8',  clientName: 'Raymond Foster',    clientPhone: '(737) 312-6609', clientAddress: '2205 Lake Austin Blvd, Austin TX 78703',     notes: 'Full split heat pump, 3-ton. Crane needed for rooftop condenser pad. Confirm permit pulled.' },
  { id: 'e11', title: 'Annual HVAC Inspection',  date: wed, startTime: '13:00', endTime: '14:00', allDay: false, type: 'Annual Inspection',    memberIds: ['m2'],      service: 'Full System Inspection',     clientId: 'hc9',  clientName: 'Aisha Obi',         clientPhone: '(512) 558-4423', clientAddress: '4800 Duval St, Austin TX 78751',             notes: 'Landlord-required annual inspection, 4-unit rental property. Document all findings for report.' },
  { id: 'e12', title: 'AC Filter Service',       date: wed, startTime: '14:30', endTime: '15:15', allDay: false, type: 'AC Service',           memberIds: ['m3'],      service: 'Filter Replacement & Check', clientId: 'hc10', clientName: 'Harold Simmons',    clientPhone: '(737) 489-1175', clientAddress: '6212 Bluff Springs Rd, Austin TX 78744',     notes: 'Quarterly filter swap on maintenance plan. Check blower motor amps while on site.' },
  { id: 'e13', title: 'Emergency Breakdown',     date: thu, startTime: '09:00', endTime: '11:00', allDay: false, type: 'Emergency Service',    memberIds: ['m1','m2'], service: 'Emergency AC Repair',         clientId: 'hc11', clientName: 'Carol Jennings',    clientPhone: '(512) 921-7700', clientAddress: '900 Industrial Blvd, Austin TX 78745',       notes: 'Commercial client, AC down in server room. Critical — data center at risk. Compressor failure suspected.' },
  { id: 'e14', title: 'Heating Tune-Up',         date: thu, startTime: '11:30', endTime: '12:30', allDay: false, type: 'Heating Repair',       memberIds: ['m3'],      service: 'Furnace Tune-Up',             clientId: 'hc12', clientName: 'Ben Kowalski',      clientPhone: '(737) 600-2281', clientAddress: '3505 Far West Blvd, Austin TX 78731',        notes: 'Pre-season furnace check. Clean burners, check heat exchanger for cracks, test CO levels.' },
  { id: 'e15', title: 'Safety & Compliance',     date: thu, startTime: '15:00', endTime: '16:30', allDay: false, type: 'Team Meeting',         memberIds: ['m1','m2','m3','m4','m5'], notes: 'OSHA refresher + review updated EPA refrigerant handling regs effective next quarter.' },
  { id: 'e16', title: 'Mini-Split Install',      date: fri, startTime: '09:00', endTime: '11:30', allDay: false, type: 'New System Install',   memberIds: ['m2','m3'], service: 'Ductless Mini-Split Install',  clientId: 'hc13', clientName: 'Megan Torres',      clientPhone: '(512) 348-9962', clientAddress: '1104 E 51st St, Austin TX 78723',            notes: '2-head Mitsubishi mini-split, garage + bonus room addition. No existing ductwork. Confirm wall penetration points.' },
  { id: 'e17', title: 'Home Energy Audit',       date: fri, startTime: '10:00', endTime: '11:30', allDay: false, type: 'Annual Inspection',    memberIds: ['m5'],      service: 'Energy Efficiency Audit',    clientId: 'hc14', clientName: 'Oliver Grant',      clientPhone: '(737) 719-5540', clientAddress: '8810 N Lamar Blvd, Austin TX 78753',         notes: 'Blower door test + thermal imaging. Customer applying for utility rebate — provide signed audit report.' },
  { id: 'e18', title: 'Weekly Job Review',       date: fri, startTime: '16:00', endTime: '17:00', allDay: false, type: 'Team Meeting',         memberIds: ['m1','m4','m5'], notes: 'Review completed jobs, outstanding invoices, next week scheduling. Flag any callback issues.' },
  { id: 'e19', title: 'Weekend Emergency Call',  date: sat, startTime: '08:00', endTime: '10:00', allDay: false, type: 'Emergency Service',    memberIds: ['m1'],      service: 'Emergency Repair',            clientId: 'hc15', clientName: 'Dana Schwartz',     clientPhone: '(512) 482-3317', clientAddress: '2711 Pecos St, Austin TX 78703',             notes: 'AC failure in extreme heat. Elderly customer — priority response. Likely capacitor or contactor.' },
]
