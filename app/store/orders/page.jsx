"use client";
export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import Loading from "@/components/Loading";
import { useAuth } from "@clerk/nextjs";
import axios from "axios";
import toast from "react-hot-toast";
import { Truck, X, Download, Printer } from "lucide-react";
import { downloadInvoice, printInvoice } from "@/lib/generateInvoice";
import { downloadAwbBill } from "@/lib/generateAwbBill";

export default function StoreOrders() {
    const currency = process.env.NEXT_PUBLIC_CURRENCY_SYMBOL || "AED";
    const { getToken } = useAuth();

    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const [trackingData, setTrackingData] = useState({
        trackingId: "",
        trackingUrl: "",
        courier: "",
    });

    // ✅ FIXED — Correct API for updating tracking
    const updateTrackingDetails = async () => {
        if (!selectedOrder) return;

        try {
            const token = await getToken();

            await axios.put(
                `/api/store/orders/${selectedOrder.id}`,
                {
                    status: selectedOrder.status,
                    trackingId: trackingData.trackingId,
                    trackingUrl: trackingData.trackingUrl,
                    courier: trackingData.courier,
                },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );

            toast.success("Tracking updated & customer notified!");
            fetchOrders();
            setIsModalOpen(false);
        } catch (error) {
            console.error(error);
            toast.error("Failed to update tracking details");
        }
    };

    const openModal = (order) => {
        setSelectedOrder(order);
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedOrder(null);
    };

    const updateOrderStatus = async (orderId, status) => {
        try {
            const token = await getToken();
            await axios.post(
                "/api/store/orders",
                { orderId, status },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            toast.success("Order status updated!");
            fetchOrders();
        } catch (error) {
            toast.error("Failed to update status");
        }
    };

    const fetchOrders = async () => {
        try {
            const token = await getToken();
            const { data } = await axios.get("/api/store/orders", {
                headers: { Authorization: `Bearer ${token}` },
            });

            setOrders(data.orders || []);
        } catch (error) {
            toast.error("Failed to load orders");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    if (loading) return <Loading />;

    return (
        <>
            <h1 className="text-2xl text-slate-500 mb-5">
                Store <span className="text-slate-800 font-medium">Orders</span>
            </h1>

            {orders.length === 0 ? (
                <p>No orders found</p>
            ) : (
                <div className="overflow-x-auto max-w-4xl rounded-md shadow border border-gray-200">
                    <table className="w-full text-sm text-left text-gray-600">
                        <thead className="bg-gray-50 text-gray-700 text-xs uppercase tracking-wider">
                            <tr>
                                {["Sr. No.", "Customer", "Total", "Payment", "Coupon", "Status", "Date"].map(
                                    (heading, i) => (
                                        <th key={i} className="px-4 py-3">
                                            {heading}
                                        </th>
                                    )
                                )}
                            </tr>
                        </thead>

                        <tbody className="divide-y divide-gray-100">
                            {orders.map((order, index) => (
                                <tr
                                    key={order.id}
                                    className="hover:bg-gray-50 cursor-pointer"
                                    onClick={() => openModal(order)}
                                >
                                    <td className="pl-6 text-green-600">{index + 1}</td>

                                    <td className="px-4 py-3">
                                        <div className="flex flex-col gap-1">
                                            <span>
                                                {order.isGuest
                                                    ? order.guestName
                                                    : order.user?.name || "Unknown"}
                                            </span>
                                            {order.isGuest && (
                                                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
                                                    Guest
                                                </span>
                                            )}
                                        </div>
                                    </td>

                                    <td className="px-4 py-3 font-medium text-slate-800">
                                        {currency}
                                        {order.total}
                                    </td>

                                    <td className="px-4 py-3">{order.paymentMethod}</td>

                                    <td className="px-4 py-3">
                                        {order.isCouponUsed ? (
                                            <span className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">
                                                {order.coupon?.code}
                                            </span>
                                        ) : (
                                            "—"
                                        )}
                                    </td>

                                    <td
                                        className="px-4 py-3"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <select
                                            value={order.status}
                                            onChange={(e) =>
                                                updateOrderStatus(order.id, e.target.value)
                                            }
                                            className="border-gray-300 rounded-md text-sm"
                                        >
                                            <option value="ORDER_PLACED">ORDER_PLACED</option>
                                            <option value="PROCESSING">PROCESSING</option>
                                            <option value="SHIPPED">SHIPPED</option>
                                            <option value="DELIVERED">DELIVERED</option>
                                        </select>
                                    </td>

                                    <td className="px-4 py-3 text-gray-500">
                                        {new Date(order.createdAt).toLocaleString()}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ---------- MODAL ---------- */}
            {isModalOpen && selectedOrder && (
                <div
                    onClick={closeModal}
                    className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50 p-4"
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
                    >
                        {/* HEADER */}
                        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6 rounded-t-2xl">
                            <div className="flex justify-between items-center">
                                <div>
                                    <h2 className="text-2xl font-bold mb-1">Order Details</h2>
                                    <p className="text-blue-100 text-xs">
                                        Order ID: {selectedOrder.id.slice(0, 8).toUpperCase()}
                                    </p>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => downloadInvoice(selectedOrder)}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg backdrop-blur-sm"
                                    >
                                        <Download size={18} /> Download
                                    </button>

                                    <button
                                        onClick={() => printInvoice(selectedOrder)}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/20 rounded-lg backdrop-blur-sm"
                                    >
                                        <Printer size={18} /> Print
                                    </button>

                                    <button
                                        onClick={() =>
                                            downloadAwbBill({
                                                awbNumber: selectedOrder.trackingId,
                                                orderId: selectedOrder.id,
                                                courier: selectedOrder.courier,
                                                date: selectedOrder.createdAt,
                                                receiverName:
                                                    selectedOrder.address?.name ||
                                                    selectedOrder.guestName,
                                                receiverAddress: `${selectedOrder.address?.street}, ${selectedOrder.address?.city}, ${selectedOrder.address?.state}, ${selectedOrder.address?.zip}, ${selectedOrder.address?.country}`,
                                                receiverPhone:
                                                    selectedOrder.address?.phone ||
                                                    selectedOrder.guestPhone,
                                            })
                                        }
                                        className="px-4 py-2 bg-orange-500 text-white rounded-lg"
                                    >
                                        <Download size={18} /> AWB Bill
                                    </button>

                                    <button
                                        onClick={closeModal}
                                        className="p-2 hover:bg-white/20 rounded-full"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* BODY */}
                        <div className="p-6 space-y-6">
                            {/* TRACKING */}
                            <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center">
                                        <Truck size={20} className="text-white" />
                                    </div>
                                    <h3 className="text-lg font-semibold text-orange-900">
                                        Tracking Information
                                    </h3>
                                </div>

                                {selectedOrder.trackingId && (
                                    <div className="bg-white p-4 rounded-lg mb-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <p>
                                                <span className="text-xs text-slate-500">
                                                    Tracking ID
                                                </span>
                                                <br />
                                                <b>{selectedOrder.trackingId}</b>
                                            </p>

                                            <p>
                                                <span className="text-xs text-slate-500">
                                                    Courier
                                                </span>
                                                <br />
                                                <b>{selectedOrder.courier}</b>
                                            </p>

                                            <p>
                                                <span className="text-xs text-slate-500">
                                                    Track Order
                                                </span>
                                                <br />
                                                {selectedOrder.trackingUrl ? (
                                                    <a
                                                        href={selectedOrder.trackingUrl}
                                                        target="_blank"
                                                        className="text-blue-600 underline"
                                                    >
                                                        View Tracking
                                                    </a>
                                                ) : (
                                                    "No URL"
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {/* Tracking Form */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <input
                                        type="text"
                                        placeholder="Tracking ID"
                                        value={trackingData.trackingId}
                                        onChange={(e) =>
                                            setTrackingData({
                                                ...trackingData,
                                                trackingId: e.target.value,
                                            })
                                        }
                                        className="px-3 py-2 border rounded-lg"
                                    />

                                    <input
                                        type="text"
                                        placeholder="Courier Name"
                                        value={trackingData.courier}
                                        onChange={(e) =>
                                            setTrackingData({
                                                ...trackingData,
                                                courier: e.target.value,
                                            })
                                        }
                                        className="px-3 py-2 border rounded-lg"
                                    />

                                    <input
                                        type="text"
                                        placeholder="Tracking URL"
                                        value={trackingData.trackingUrl}
                                        onChange={(e) =>
                                            setTrackingData({
                                                ...trackingData,
                                                trackingUrl: e.target.value,
                                            })
                                        }
                                        className="px-3 py-2 border rounded-lg"
                                    />
                                </div>

                                <button
                                    onClick={updateTrackingDetails}
                                    className="mt-3 w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 rounded-lg"
                                >
                                    Update Tracking & Notify Customer
                                </button>
                            </div>

                            {/* CUSTOMER DETAILS */}
                            <div className="bg-slate-50 rounded-xl p-5">
                                <h3 className="font-semibold text-slate-900 mb-3">Customer Details</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                    <p>
                                        <span className="text-slate-500">Name</span>
                                        <br />
                                        <b>
                                            {selectedOrder.isGuest
                                                ? selectedOrder.guestName
                                                : selectedOrder.user?.name}
                                        </b>
                                    </p>

                                    <p>
                                        <span className="text-slate-500">Email</span>
                                        <br />
                                        <b>
                                            {selectedOrder.isGuest
                                                ? selectedOrder.guestEmail
                                                : selectedOrder.user?.email}
                                        </b>
                                    </p>

                                    <p>
                                        <span className="text-slate-500">Phone</span>
                                        <br />
                                        <b>
                                            {selectedOrder.isGuest
                                                ? selectedOrder.guestPhone
                                                : selectedOrder.address?.phone}
                                        </b>
                                    </p>

                                    <p>
                                        <span className="text-slate-500">Address</span>
                                        <br />
                                        <b>
                                            {selectedOrder.address?.street},{" "}
                                            {selectedOrder.address?.city},{" "}
                                            {selectedOrder.address?.state},{" "}
                                            {selectedOrder.address?.zip},{" "}
                                            {selectedOrder.address?.country}
                                        </b>
                                    </p>
                                </div>
                            </div>

                            {/* PRODUCTS */}
                            <div>
                                <h3 className="font-semibold text-slate-900 mb-3">Order Items</h3>
                                <div className="space-y-3">
                                    {selectedOrder.orderItems.map((item, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-4 border p-3 rounded-xl"
                                        >
                                            <img
                                                src={item.product?.images?.[0]}
                                                alt={item.product?.name}
                                                className="w-20 h-20 rounded-lg object-cover"
                                            />

                                            <div className="flex-1">
                                                <p className="font-medium">{item.product?.name}</p>
                                                <p className="text-sm">Qty: {item.quantity}</p>
                                                <p className="text-sm font-semibold">
                                                    {currency}
                                                    {item.price} each
                                                </p>
                                            </div>

                                            <div className="text-right font-bold">
                                                {currency}
                                                {item.price * item.quantity}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* PAYMENT & STATUS */}
                            <div className="bg-slate-50 rounded-xl p-5">
                                <h3 className="font-semibold text-slate-900 mb-3">Payment & Status</h3>

                                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                    <p>
                                        <span className="text-slate-500">Total Amount</span>
                                        <br />
                                        <b>
                                            {currency}
                                            {selectedOrder.total}
                                        </b>
                                    </p>

                                    <p>
                                        <span className="text-slate-500">Payment Method</span>
                                        <br />
                                        <b>{selectedOrder.paymentMethod}</b>
                                    </p>

                                    <p>
                                        <span className="text-slate-500">Payment Status</span>
                                        <br />
                                        <b>{selectedOrder.isPaid ? "Paid" : "Pending"}</b>
                                    </p>

                                    {selectedOrder.isCouponUsed && (
                                        <p>
                                            <span className="text-slate-500">Coupon</span>
                                            <br />
                                            <b className="text-green-600">
                                                {selectedOrder.coupon.code} (
                                                {selectedOrder.coupon.discount}%)
                                            </b>
                                        </p>
                                    )}

                                    <p>
                                        <span className="text-slate-500">Order Status</span>
                                        <br />
                                        <b>{selectedOrder.status}</b>
                                    </p>

                                    <p>
                                        <span className="text-slate-500">Date</span>
                                        <br />
                                        <b>
                                            {new Date(
                                                selectedOrder.createdAt
                                            ).toLocaleDateString()}
                                        </b>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
