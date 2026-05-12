import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

export const screenerApi = createApi({
  reducerPath: "screenerApi",
  baseQuery: fetchBaseQuery({ baseUrl: "/api" }),
  endpoints: (builder) => ({
    getDefaults: builder.query({
      query: () => "/defaults"
    }),
    screen: builder.mutation({
      query: (settings) => ({
        url: "/screen",
        method: "POST",
        body: settings
      })
    })
  })
});

export const { useGetDefaultsQuery, useScreenMutation } = screenerApi;
