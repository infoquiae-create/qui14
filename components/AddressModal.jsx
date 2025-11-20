'use client'
import { addAddress, updateAddress } from "@/lib/features/address/addressSlice"
import { useAuth } from "@clerk/nextjs"
import axios from "axios"
import { XIcon } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "react-hot-toast"
import { useDispatch } from "react-redux"

const AddressModal = ({ setShowAddressModal, editingAddress, setEditingAddress }) => {

    const { getToken } = useAuth()
    const dispatch = useDispatch()

    const isEdit = Boolean(editingAddress)

    const [address, setAddress] = useState({
        name: '',
        email: '',
        street: '',
        city: '',
        state: '',
        zip: '',
        country: 'United Arab Emirates',
        phone: '',
        phoneCode: '+971'
    })

    const countries = [
        { name: 'United Arab Emirates', code: '+971' },
        { name: 'Saudi Arabia', code: '+966' },
        { name: 'Qatar', code: '+974' },
        { name: 'Kuwait', code: '+965' },
        { name: 'Bahrain', code: '+973' },
        { name: 'Oman', code: '+968' },
        { name: 'India', code: '+91' },
        { name: 'Pakistan', code: '+92' },
    ]

    // Prefill on edit
    useEffect(() => {
        if (isEdit && editingAddress) {
            setAddress({
                name: editingAddress.name,
                email: editingAddress.email,
                street: editingAddress.street,
                city: editingAddress.city,
                state: editingAddress.state,
                zip: editingAddress.zip || '',
                country: editingAddress.country,
                phone: editingAddress.phone,
                phoneCode: editingAddress.phoneCode || '+971'
            })
        }
    }, [editingAddress])

    const handleAddressChange = (e) => {
        const { name, value } = e.target

        if (name === 'country') {
            const selected = countries.find(c => c.name === value)
            setAddress(prev => ({
                ...prev,
                country: value,
                phoneCode: selected?.code || '+971'
            }))
        } else {
            setAddress(prev => ({ ...prev, [name]: value }))
        }
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        try {
            const token = await getToken()

            const addressData = { ...address }
            if (!addressData.zip) delete addressData.zip
            delete addressData.phoneCode // backend doesn't require it

            if (isEdit) {
                // UPDATE
                const { data } = await axios.put(
                    `/api/address/${editingAddress.id}`,
                    addressData,
                    { headers: { Authorization: `Bearer ${token}` } }
                )
                dispatch(updateAddress(data.updatedAddress))
                toast.success("Address updated successfully")
            } else {
                // ADD
                const { data } = await axios.post(
                    '/api/address',
                    { address: addressData },
                    { headers: { Authorization: `Bearer ${token}` } }
                )
                dispatch(addAddress(data.newAddress))
                toast.success(data.message)
            }

            setEditingAddress(null)
            setShowAddressModal(false)

        } catch (error) {
            console.log(error)
            toast.error(error?.response?.data?.error || error.message)
        }
    }

    return (
        <form
            onSubmit={e => toast.promise(handleSubmit(e), { loading: isEdit ? "Updating..." : "Adding..." })}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm h-screen flex items-center justify-center p-4"
        >
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">
                        {isEdit ? "Edit Address" : "Add New Address"}
                    </h2>
                    <button
                        type="button"
                        onClick={() => {
                            setEditingAddress(null)
                            setShowAddressModal(false)
                        }}
                        className="text-gray-400 hover:text-gray-600 transition"
                    >
                        <XIcon size={24} />
                    </button>
                </div>

                {/* SAME UI – NOTHING REMOVED */}
                <div className="space-y-4">

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                        <input
                            name="name"
                            onChange={handleAddressChange}
                            value={address.name}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                        <input
                            name="email"
                            onChange={handleAddressChange}
                            value={address.email}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Street Address</label>
                        <input
                            name="street"
                            onChange={handleAddressChange}
                            value={address.street}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">City</label>
                            <input
                                name="city"
                                onChange={handleAddressChange}
                                value={address.city}
                                className="w-full px-4 py-2.5 border"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">State/Emirate</label>
                            <input
                                name="state"
                                onChange={handleAddressChange}
                                value={address.state}
                                className="w-full px-4 py-2.5 border"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Zip/Postal Code (Optional)</label>
                        <input
                            name="zip"
                            onChange={handleAddressChange}
                            value={address.zip}
                            className="w-full px-4 py-2.5 border"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Country</label>
                        <select
                            name="country"
                            onChange={handleAddressChange}
                            value={address.country}
                            className="w-full px-4 py-2.5 border"
                            required
                        >
                            {countries.map(c => (
                                <option key={c.name} value={c.name}>{c.name}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                        <div className="flex gap-2">
                            <div className="px-3 py-2 bg-gray-100 border rounded-lg">{address.phoneCode}</div>
                            <input
                                name="phone"
                                onChange={handleAddressChange}
                                value={address.phone}
                                className="flex-1 px-4 py-2.5 border rounded-lg"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold"
                    >
                        {isEdit ? "Update Address" : "SAVE ADDRESS"}
                    </button>
                </div>
            </div>
        </form>
    )
}

export default AddressModal
