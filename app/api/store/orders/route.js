import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Debug log helper
function debugLog(...args) {
    try { console.log("[ORDER API DEBUG]", ...args); } catch {}
}

/* =======================================================
   UPDATE ORDER STATUS (POST)
======================================================= */
export async function POST(request) {
    try {
        const { userId } = getAuth(request);
        const storeId = await authSeller(userId);

        if (!storeId) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }

        const { orderId, status } = await request.json();

        await prisma.order.update({
            where: { id: orderId, storeId },
            data: { status }
        });

        return NextResponse.json({ message: "Order Status updated" });

    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}

/* =======================================================
   GET ALL STORE ORDERS (GET)
======================================================= */
export async function GET(request) {
    console.log("[ORDER API ROUTE] Route hit");

    try {
        const { userId } = getAuth(request);
        debugLog("userId from Clerk:", userId);

        const storeId = await authSeller(userId);
        debugLog("storeId from authSeller:", storeId);

        if (!storeId) {
            return NextResponse.json({ error: "not authorized" }, { status: 401 });
        }

        const orders = await prisma.order.findMany({
            where: { storeId },
            orderBy: { createdAt: "desc" },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        Address: true,
                    }
                },
                guestUser: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                    }
                },
                address: true,
                orderItems: {
                    include: {
                        product: true
                    }
                }
            }
        });
        });

        debugLog("orders found:", orders.length);

        return NextResponse.json({ orders });

    } catch (error) {
        console.error("[ORDER API ERROR]", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
