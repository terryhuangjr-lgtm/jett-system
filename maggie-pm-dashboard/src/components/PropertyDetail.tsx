import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { StatusBadge } from './ui/StatusBadge'
import { ChevronLeft, MapPin, Building2 } from 'lucide-react'

interface FullProperty {
  id: string
  address: string
  unit_number: string | null
  city: string
  state: string
  property_type: string
  bedrooms: number
  bathrooms: number
  owner_name: string
  owner_email: string | null
  owner_phone: string | null
  status: string
  monthly_management_fee: number
  notes: string | null
}

interface TenantInfo {
  id: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  move_in_date: string | null
  emergency_contact_name: string | null
  emergency_contact_phone: string | null
}

interface LeaseInfo {
  id: string
  lease_start: string
  lease_end: string
  monthly_rent: number
  security_deposit: number | null
  rent_due_day: number
  status: string
}

export function PropertyDetail({ propertyId, onBack }: { propertyId: string, onBack: () => void }) {
  const [property, setProperty] = useState<FullProperty | null>(null)
  const [tenant, setTenant] = useState<TenantInfo | null>(null)
  const [lease, setLease] = useState<LeaseInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadProperty()
  }, [propertyId])

  async function loadProperty() {
    try {
      const { data: props } = await supabase.from('properties').select('*').eq('id', propertyId).single()
      if (props) {
        setProperty(props)

        // Get active lease for this property
        const { data: leases } = await supabase
          .from('leases')
          .select('*')
          .eq('property_id', propertyId)
          .eq('status', 'active')
          .single()

        if (leases) {
          setLease(leases)
          const { data: tenantData } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', leases.tenant_id)
            .single()
          if (tenantData) setTenant(tenantData)
        }
      }
    } catch (err) {
      console.error('Failed to load property:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) return <div className="loading-state"><Building2 /> <p>Loading property details...</p></div>
  if (!property) return <div className="error-state"><MapPin /> <p>Property not found</p></div>

  return (
    <div>
      <button className="nav-item" onClick={onBack} style={{ width: 'auto', marginBottom: 16 }}>
        <ChevronLeft size={18} /> Back to Properties
      </button>

      <div className="detail-header">
        <div>
          <h2>{property.address}{property.unit_number ? `, ${property.unit_number}` : ''}</h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            {property.city}, {property.state} • {property.property_type} • {property.bedrooms} bed / {property.bathrooms} bath
          </p>
        </div>
        <StatusBadge status={property.status} />
      </div>

      <div className="detail-grid">
        <div className="card">
          <div className="card-header"><h3>🏢 Property Info</h3></div>
          <div className="card-body">
            <div className="detail-field">
              <div className="detail-field-label">Property Type</div>
              <div className="detail-field-value">{property.property_type}</div>
            </div>
            <div className="detail-field">
              <div className="detail-field-label">Bedrooms / Bathrooms</div>
              <div className="detail-field-value">{property.bedrooms} bed / {property.bathrooms} bath</div>
            </div>
            <div className="detail-field">
              <div className="detail-field-label">Management Fee</div>
              <div className="detail-field-value">${Number(property.monthly_management_fee || 0).toLocaleString()}/mo</div>
            </div>
            {property.notes && (
              <div className="detail-field">
                <div className="detail-field-label">Notes</div>
                <div className="detail-field-value">{property.notes}</div>
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><h3>👤 Owner Info</h3></div>
          <div className="card-body">
            <div className="detail-field">
              <div className="detail-field-label">Name</div>
              <div className="detail-field-value">{property.owner_name}</div>
            </div>
            {property.owner_email && (
              <div className="detail-field">
                <div className="detail-field-label">Email</div>
                <div className="detail-field-value">{property.owner_email}</div>
              </div>
            )}
            {property.owner_phone && (
              <div className="detail-field">
                <div className="detail-field-label">Phone</div>
                <div className="detail-field-value">{property.owner_phone}</div>
              </div>
            )}
          </div>
        </div>

        {tenant && (
          <div className="card">
            <div className="card-header"><h3>👥 Current Tenant</h3></div>
            <div className="card-body">
              <div className="detail-field">
                <div className="detail-field-label">Name</div>
                <div className="detail-field-value">{tenant.first_name} {tenant.last_name}</div>
              </div>
              {tenant.email && (
                <div className="detail-field">
                  <div className="detail-field-label">Email</div>
                  <div className="detail-field-value">{tenant.email}</div>
                </div>
              )}
              {tenant.phone && (
                <div className="detail-field">
                  <div className="detail-field-label">Phone</div>
                  <div className="detail-field-value">{tenant.phone}</div>
                </div>
              )}
              {tenant.move_in_date && (
                <div className="detail-field">
                  <div className="detail-field-label">Move In Date</div>
                  <div className="detail-field-value">{new Date(tenant.move_in_date).toLocaleDateString()}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {lease && (
          <div className="card">
            <div className="card-header"><h3>📄 Lease Details</h3></div>
            <div className="card-body">
              <div className="detail-field">
                <div className="detail-field-label">Monthly Rent</div>
                <div className="detail-field-value" style={{ fontSize: 18, fontWeight: 700, color: 'var(--green)' }}>
                  ${Number(lease.monthly_rent).toLocaleString()}/mo
                </div>
              </div>
              <div className="detail-field">
                <div className="detail-field-label">Lease Period</div>
                <div className="detail-field-value">
                  {new Date(lease.lease_start).toLocaleDateString()} — {new Date(lease.lease_end).toLocaleDateString()}
                </div>
              </div>
              <div className="detail-field">
                <div className="detail-field-label">Rent Due Day</div>
                <div className="detail-field-value">{lease.rent_due_day}th of each month</div>
              </div>
              {lease.security_deposit && (
                <div className="detail-field">
                  <div className="detail-field-label">Security Deposit</div>
                  <div className="detail-field-value">${Number(lease.security_deposit).toLocaleString()}</div>
                </div>
              )}
              <div className="detail-field">
                <div className="detail-field-label">Status</div>
                <div className="detail-field-value"><StatusBadge status={lease.status} /></div>
              </div>
              <div className="detail-field">
                <div className="detail-field-label">Lease Expires</div>
                <div className="detail-field-value" style={{
                  color: new Date(lease.lease_end) < new Date() ? 'var(--red)' :
                         new Date(lease.lease_end) < new Date(Date.now() + 30*24*60*60*1000) ? 'var(--yellow)' : 'inherit'
                }}>
                  {new Date(lease.lease_end).toLocaleDateString()}
                  {new Date(lease.lease_end) < new Date() ? ' (EXPIRED)' : ''}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
