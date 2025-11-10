export interface TimelineUser {
  id: string
  name: string
  email: string
  role: string
  department: string
  phone: string
  status: string
}

export const timelineUsers: TimelineUser[] = [
  {
    id: 'user1',
    name: 'Rajesh Kumar',
    email: 'rajesh.kumar@company.com',
    role: 'Project Manager',
    department: 'Infrastructure',
    phone: '+91 98765 43210',
    status: 'Active'
  },
  {
    id: 'user2',
    name: 'Priya Sharma',
    email: 'priya.sharma@company.com',
    role: 'Senior Engineer',
    department: 'Civil Engineering',
    phone: '+91 87654 32109',
    status: 'Active'
  },
  {
    id: 'user3',
    name: 'Mehul Patel',
    email: 'mehul.patel@company.com',
    role: 'Technical Lead',
    department: 'IT Solutions',
    phone: '+91 76543 21098',
    status: 'Active'
  },
  {
    id: 'user4',
    name: 'Anita Singh',
    email: 'anita.singh@company.com',
    role: 'Procurement Specialist',
    department: 'Operations',
    phone: '+91 65432 10987',
    status: 'Active'
  }
]

export interface TimelineTender {
  id: string
  tenderId: string
  tenderName: string
  gemId: string
  estimatedStartDate: string
  estimatedEndDate: string
  assignedTo: string
  status: string
}

export const timelineTenders: TimelineTender[] = [
  {
    id: '1',
    tenderId: 'GEM-2024-001',
    tenderName: 'Smart City Infrastructure Development Phase I',
    gemId: 'GEM789456123',
    estimatedStartDate: '2024-01-15',
    estimatedEndDate: '2024-04-30',
    assignedTo: 'user1',
    status: 'Ready to Submit'
  },
  {
    id: '2',
    tenderId: 'GEM-2024-002',
    tenderName: 'Urban Water Pipeline Expansion Project',
    gemId: 'GEM456789012',
    estimatedStartDate: '2024-02-01',
    estimatedEndDate: '2024-06-15',
    assignedTo: 'user2',
    status: 'Submitted'
  },
  {
    id: '3',
    tenderId: 'GEM-2024-003',
    tenderName: 'Highway Construction and Maintenance',
    gemId: 'GEM123456789',
    estimatedStartDate: '2024-03-10',
    estimatedEndDate: '2024-08-20',
    assignedTo: 'user3',
    status: 'Ready to Submit'
  },
  {
    id: '4',
    tenderId: 'GEM-2024-004',
    tenderName: 'Solar Power Plant Installation',
    gemId: 'GEM987654321',
    estimatedStartDate: '2024-01-20',
    estimatedEndDate: '2024-05-10',
    assignedTo: 'user1',
    status: 'Submitted'
  },
  {
    id: '5',
    tenderId: 'GEM-2024-005',
    tenderName: 'Metro Rail Extension Project',
    gemId: 'GEM654321987',
    estimatedStartDate: '2024-04-01',
    estimatedEndDate: '2024-12-31',
    assignedTo: 'user4',
    status: 'Ready to Submit'
  },
  {
    id: '6',
    tenderId: 'GEM-2024-006',
    tenderName: 'Digital Education Platform Development',
    gemId: 'GEM321987654',
    estimatedStartDate: '2024-02-15',
    estimatedEndDate: '2024-07-30',
    assignedTo: 'user2',
    status: 'Submitted'
  },
  {
    id: '7',
    tenderId: 'GEM-2024-007',
    tenderName: 'Waste Management System Upgrade',
    gemId: 'GEM147258369',
    estimatedStartDate: '2024-03-01',
    estimatedEndDate: '2024-09-15',
    assignedTo: 'user3',
    status: 'Ready to Submit'
  },
  {
    id: '8',
    tenderId: 'GEM-2024-008',
    tenderName: 'Airport Terminal Modernization',
    gemId: 'GEM963852741',
    estimatedStartDate: '2024-05-01',
    estimatedEndDate: '2024-11-30',
    assignedTo: 'user1',
    status: 'Submitted'
  }
]
