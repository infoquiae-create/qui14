
'use client'

import React from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import Title from './Title'
import ProductCard from './ProductCard'

// BestSelling Component
const BestSelling = () => {
  const displayQuantity = 10
  // Only select the top 10 products, avoid re-renders if the rest of the list changes
  const products = useSelector(
    state => (state.product.list || [])
      .slice()
      .sort((a, b) => (b.rating?.length || b.ratingCount || 0) - (a.rating?.length || a.ratingCount || 0))
      .slice(0, displayQuantity),
    shallowEqual
  )
  const isLoading = products.length === 0

  return (
    <div className="px-4 my-16 max-w-7xl mx-auto">
      <Title
        title="Craziest sale of the year!"
        description="Grab the best deals before they're gone!"
        visibleButton={false}
      />
      <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-5 xl:grid-cols-5 gap-3 md:gap-6">
        {isLoading
          ? Array(displayQuantity).fill(0).map((_, idx) => (
              <div key={idx} className="bg-white rounded-2xl border border-gray-200 shadow-sm animate-pulse flex flex-col w-full h-full relative">
                <div className="relative w-full h-56 overflow-hidden bg-gray-100 rounded-t-2xl" />
                <div className="mt-2 flex flex-col flex-grow justify-between p-3">
                  <div>
                    <div className="h-4 w-32 bg-gray-200 rounded mb-2" />
                    <div className="flex items-center mt-1 gap-1">
                      {Array(5).fill(0).map((_, i) => (
                        <div key={i} className="h-3 w-3 bg-gray-200 rounded-full" />
                      ))}
                      <div className="h-3 w-8 bg-gray-100 rounded ml-1" />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="h-4 w-20 bg-gray-200 rounded" />
                    <div className="h-3 w-12 bg-gray-100 rounded" />
                  </div>
                </div>
                <div className="absolute bottom-4 right-4 w-10 h-10 bg-gray-200 rounded-full" />
              </div>
            ))
          : products.map((product, idx) => (
              <ProductCard key={product.id} product={product} priority={idx === 0} />
            ))}
      </div>
    </div>
  )
}

export default BestSelling
