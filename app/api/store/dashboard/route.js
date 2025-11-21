import prisma from "@/lib/prisma";
import authSeller from "@/middlewares/authSeller";
import { getAuth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";


// Get Dashboard Data for Seller ( total orders, total earnings, total products )
export async function GET(request){
    try {
        const { userId } = getAuth(request)
        const storeId = await authSeller(userId)

        // Get all orders for seller
        const orders = await prisma.order.findMany({where: {storeId}})

         // Get all products with ratings for seller
         const products = await prisma.product.findMany({where: {storeId}})

         const ratings = await prisma.rating.findMany({
            where: {productId: {in: products.map(product => product.id)}},
            include: {user: true, product: true}
         })

         // Get unique customers who have ordered from this store
         const loggedInCustomerIds = [...new Set(orders.filter(o => !o.isGuest).map(order => order.userId))];
         const guestCustomers = orders.filter(o => o.isGuest).map(order => ({
            id: `guest-${o.id}`,
            name: o.guestName || 'Guest',
            email: o.guestEmail || 'No email',
            phone: o.guestPhone || '',
         }));
         let customers = [];
         if (loggedInCustomerIds.length > 0) {
            // Fetch user details and their default address
            const loggedInCustomers = await prisma.user.findMany({
               where: { id: { in: loggedInCustomerIds } },
               select: { id: true, name: true, email: true, Address: { select: { phone: true, street: true, city: true, state: true, zip: true, country: true } } }
            });
            // Flatten address info for dashboard
            const formattedLoggedInCustomers = loggedInCustomers.map(u => ({
                id: u.id,
                name: u.name,
                email: u.email,
                phone: u.Address?.[0]?.phone || '',
                address: u.Address?.[0] ? `${u.Address[0].street}, ${u.Address[0].city}, ${u.Address[0].state}, ${u.Address[0].zip}, ${u.Address[0].country}` : ''
            }));
            customers = [...formattedLoggedInCustomers, ...guestCustomers];
         } else {
            customers = guestCustomers;
         }
         const totalCustomers = customers.length;

         // Get abandoned carts for this store
         const abandonedCarts = await prisma.abandonedCart.count({
            where: {storeId}
         })

         const dashboardData = {
            ratings,
            totalOrders: orders.length,
            totalEarnings: Math.round(orders.reduce((acc, order)=>  acc + order.total, 0)),
            totalProducts: products.length,
            totalCustomers,
            customers, // Array of {id, name, email}
            abandonedCarts
         }

         return NextResponse.json({ dashboardData });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error.code || error.message }, { status: 400 })
    }
}