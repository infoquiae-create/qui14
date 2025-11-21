import prisma from "@/lib/prisma";
import { getAuth } from "@clerk/nextjs/server";
import { PaymentMethod } from "@prisma/client";
import { NextResponse } from "next/server";
import Stripe from "stripe";
import crypto from "crypto";

export async function POST(request) {
  try {
    const { userId, has } = getAuth(request);
    const { addressId, items, couponCode, paymentMethod, isGuest, guestInfo } =
      await request.json();

    // ---------------------------
    // VALIDATION
    // ---------------------------
    if (isGuest) {
      if (
        !guestInfo ||
        !guestInfo.name ||
        !guestInfo.email ||
        !guestInfo.phone ||
        !guestInfo.address ||
        !guestInfo.city ||
        !guestInfo.state ||
        !guestInfo.country
      ) {
        return NextResponse.json(
          { error: "missing guest information" },
          { status: 400 }
        );
      }

      if (!paymentMethod || !items?.length) {
        return NextResponse.json(
          { error: "missing order details." },
          { status: 400 }
        );
      }
    } else {
      if (!userId) {
        return NextResponse.json({ error: "not authorized" }, { status: 401 });
      }

      if (!addressId || !paymentMethod || !items?.length) {
        return NextResponse.json(
          { error: "missing order details." },
          { status: 401 }
        );
      }
    }

    // ---------------------------
    // COUPON LOGIC
    // ---------------------------
    let coupon = null;

    if (couponCode) {
      coupon = await prisma.coupon.findUnique({
        where: { code: couponCode },
      });

      if (!coupon) {
        return NextResponse.json(
          { error: "Coupon not found" },
          { status: 400 }
        );
      }
    }

    if (couponCode && coupon.forNewUser) {
      const hasOrders = await prisma.order.findFirst({ where: { userId } });
      if (hasOrders) {
        return NextResponse.json(
          { error: "Coupon valid for new users" },
          { status: 400 }
        );
      }
    }

    const isPlusMember = has({ plan: "plus" });

    if (couponCode && coupon.forMember && !isPlusMember) {
      return NextResponse.json(
        { error: "Coupon valid for members only" },
        { status: 400 }
      );
    }

    // ---------------------------
    // PREP ORDER GROUPING
    // ---------------------------
    const ordersByStore = new Map();
    let grandSubtotal = 0;

    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.id },
      });

      const storeId = product.storeId;

      if (!ordersByStore.has(storeId)) {
        ordersByStore.set(storeId, []);
      }

      ordersByStore.get(storeId).push({
        ...item,
        price: product.price,
      });

      grandSubtotal += Number(product.price) * Number(item.quantity);
    }

    // shipping disabled
    const shippingFee = 0;

    let orderIds = [];
    let fullAmount = 0;

    // ---------------------------
    // CREATE ORDER FOR EACH STORE
    // ---------------------------
    let lastCreatedOrder = null;

    for (const [storeId, sellerItems] of ordersByStore.entries()) {
      let total = sellerItems.reduce(
        (sum, i) => sum + i.price * i.quantity,
        0
      );

      if (couponCode) {
        if (coupon.discountType === "percentage") {
          total -= (total * coupon.discount) / 100;
        } else {
          total -= Math.min(coupon.discount, total);
        }
      }

      total += shippingFee;

      total = parseFloat(total.toFixed(2));
      fullAmount += total;

      const orderData = {
        storeId,
        total,
        paymentMethod,
        isCouponUsed: !!coupon,
        coupon: coupon || {},
        orderItems: {
          create: sellerItems.map((i) => ({
            productId: i.id,
            quantity: i.quantity,
            price: i.price,
          })),
        },
      };

      if (isGuest) {
        await prisma.user.upsert({
          where: { id: "guest" },
          update: {},
          create: {
            id: "guest",
            name: "Guest User",
            email: "guest@system.local",
            image: "",
            cart: [],
          },
        });

        const guestAddr = await prisma.address.create({
          data: {
            userId: "guest",
            name: guestInfo.name,
            email: guestInfo.email,
            phone: guestInfo.phone,
            street: guestInfo.address,
            city: guestInfo.city,
            state: guestInfo.state,
            zip: "00000",
            country: guestInfo.country,
          },
        });

        orderData.addressId = guestAddr.id;
        orderData.isGuest = true;
        orderData.guestName = guestInfo.name;
        orderData.guestEmail = guestInfo.email;
        orderData.guestPhone = guestInfo.phone;
      } else {
        // For logged-in users, set userId and addressId, and ensure guest fields are not set
        orderData.userId = userId;
        orderData.addressId = addressId;
        orderData.isGuest = false;
        orderData.guestName = undefined;
        orderData.guestEmail = undefined;
        orderData.guestPhone = undefined;
      }

      const created = await prisma.order.create({
        data: orderData,
        include: {
          user: true,
          orderItems: { include: { product: true } },
        },
      });

      lastCreatedOrder = created;
      orderIds.push(created.id);
    }

    // ---------------------------
    // STRIPE CHECKOUT
    // ---------------------------
    if (paymentMethod === "STRIPE") {
      const stripe = Stripe(process.env.STRIPE_SECRET_KEY);
      const origin = request.headers.get("origin");

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [
          {
            price_data: {
              currency: "aed",
              product_data: { name: "Order" },
              unit_amount: Math.round(fullAmount * 100),
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${origin}/loading?nextUrl=orders`,
        cancel_url: `${origin}/cart`,
        metadata: {
          orderIds: orderIds.join(","),
          userId,
          appId: "Qui",
        },
      });

      return NextResponse.json({ session });
    }

    // clear cart after COD order
    if (userId) {
      await prisma.user.update({
        where: { id: userId },
        data: { cart: {} },
      });
    }

    // guest return multiple orders
    if (isGuest) {
      const orders = await prisma.order.findMany({
        where: { id: { in: orderIds } },
        include: {
          orderItems: { include: { product: true } },
          user: true,
        },
      });

      return NextResponse.json({
        message: "Orders Placed Successfully",
        orders,
      });
    }

    // logged-in user: return single order
    return NextResponse.json({
      message: "Orders Placed Successfully",
      order: lastCreatedOrder,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}

// ---------------------------
// GET USER ORDERS
// ---------------------------
export async function GET(request) {
  try {
    const { userId } = getAuth(request);

    const orders = await prisma.order.findMany({
      where: {
        userId,
        OR: [
          { paymentMethod: PaymentMethod.COD },
          { paymentMethod: PaymentMethod.STRIPE, isPaid: true },
        ],
      },
      include: {
        orderItems: { include: { product: true } },
        address: true,
        user: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ orders });
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: 400 }
    );
  }
}
