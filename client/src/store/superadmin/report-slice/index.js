import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api/superadmin/reports";

export const fetchSalesReport = createAsyncThunk(
  "superAdminReports/fetchSalesReport",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/sales`, {
        withCredentials: true,
      });
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || "Failed to fetch sales report."
      );
    }
  }
);

export const fetchMonthlySalesReport = createAsyncThunk(
  "superAdminReports/fetchMonthlySalesReport",
  async ({ year, month }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/sales/monthly`, {
        params: { year, month },
        withCredentials: true,
      });
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || "Failed to fetch monthly sales report."
      );
    }
  }
);

export const fetchYearlySalesReport = createAsyncThunk(
  "superAdminReports/fetchYearlySalesReport",
  async ({ year }, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/sales/yearly`, {
        params: { year },
        withCredentials: true,
      });
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || "Failed to fetch yearly sales report."
      );
    }
  }
);

export const fetchInventoryReport = createAsyncThunk(
  "superAdminReports/fetchInventoryReport",
  async ({ year, month } = {}, { rejectWithValue }) => {
    try {
      const params = {};
      if (year) params.year = year;
      if (month) params.month = month;

      const response = await axios.get(`${API_BASE_URL}/inventory`, {
        params,
        withCredentials: true,
      });
      return response.data?.data;
    } catch (error) {
      return rejectWithValue(
        error?.response?.data?.message || "Failed to fetch inventory report."
      );
    }
  }
);

const initialState = {
  salesReport: {
    data: null,
    isLoading: false,
    error: null,
  },
  monthlySalesReport: {
    data: null,
    isLoading: false,
    error: null,
  },
  yearlySalesReport: {
    data: null,
    isLoading: false,
    error: null,
  },
  inventoryReport: {
    data: null,
    isLoading: false,
    error: null,
  },
};

const reportSlice = createSlice({
  name: "superAdminReports",
  initialState,
  reducers: {
    clearReportError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Sales Report
    builder
      .addCase(fetchSalesReport.pending, (state) => {
        state.salesReport.isLoading = true;
        state.salesReport.error = null;
      })
      .addCase(fetchSalesReport.fulfilled, (state, action) => {
        state.salesReport.isLoading = false;
        state.salesReport.data = action.payload;
      })
      .addCase(fetchSalesReport.rejected, (state, action) => {
        state.salesReport.isLoading = false;
        state.salesReport.data = null;
        state.salesReport.error = action.payload;
      })
      // Monthly Sales Report
      .addCase(fetchMonthlySalesReport.pending, (state) => {
        state.monthlySalesReport.isLoading = true;
        state.monthlySalesReport.error = null;
      })
      .addCase(fetchMonthlySalesReport.fulfilled, (state, action) => {
        state.monthlySalesReport.isLoading = false;
        state.monthlySalesReport.data = action.payload;
      })
      .addCase(fetchMonthlySalesReport.rejected, (state, action) => {
        state.monthlySalesReport.isLoading = false;
        state.monthlySalesReport.data = null;
        state.monthlySalesReport.error = action.payload;
      })
      // Yearly Sales Report
      .addCase(fetchYearlySalesReport.pending, (state) => {
        state.yearlySalesReport.isLoading = true;
        state.yearlySalesReport.error = null;
      })
      .addCase(fetchYearlySalesReport.fulfilled, (state, action) => {
        state.yearlySalesReport.isLoading = false;
        state.yearlySalesReport.data = action.payload;
      })
      .addCase(fetchYearlySalesReport.rejected, (state, action) => {
        state.yearlySalesReport.isLoading = false;
        state.yearlySalesReport.data = null;
        state.yearlySalesReport.error = action.payload;
      })
      // Inventory Report
      .addCase(fetchInventoryReport.pending, (state) => {
        state.inventoryReport.isLoading = true;
        state.inventoryReport.error = null;
      })
      .addCase(fetchInventoryReport.fulfilled, (state, action) => {
        state.inventoryReport.isLoading = false;
        state.inventoryReport.data = action.payload;
      })
      .addCase(fetchInventoryReport.rejected, (state, action) => {
        state.inventoryReport.isLoading = false;
        state.inventoryReport.data = null;
        state.inventoryReport.error = action.payload;
      });
  },
});

export const { clearReportError } = reportSlice.actions;

export default reportSlice.reducer;


