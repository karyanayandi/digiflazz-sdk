import crypto from "crypto"
import axios, { type AxiosError, type AxiosResponse } from "axios"

export type PriceListType = "prepaid" | "pasca"

export type TransactoinType =
  | null
  | "inq-pasca"
  | "pay-pasca"
  | "status-pasca"
  | "pln-subscribe"

export interface DigiflazzConfigProps {
  username: string
  key: string
  webhook?: string
}

export interface DigiflazzReturnProps<T> {
  cekSaldo: () => Promise<T>
  daftarHarga: (cmdOption: PriceListType) => Promise<T>
  deposit: (props: DigiflazzDepositProps) => Promise<T>
  transaksi: (props: DigiflazzTransactionProps) => Promise<T>
}

export interface DigiflazzDepositProps {
  amount: number
  bank: string
  name: string
}

export interface DigiflazzTransactionProps {
  sku: string
  customerNo: string
  refId: string
  cmd?: TransactoinType
  testing: boolean
  msg: string
  max_price?: number
  cb_url?: string
  allow_dot?: boolean
}

export interface CekSaldoReturnProps extends AxiosResponse {
  data: {
    deposit: number
  }
}

export interface DaftarHargaPrePaidReturnProps extends AxiosResponse {
  data: {
    product_name: string
    category: string
    brand: string
    type: string
    seller_name: string
    price: number
    buyer_sku_code: string
    buyer_product_status: boolean
    seller_product_status: boolean
    unlimited_stock: boolean
    stock: number
    multi: boolean
    start_cut_off: string
    end_cut_off: string
    desc: string
  }[]
}

export interface DaftarHargaPostPaidReturnProps extends AxiosResponse {
  data: {
    product_name: string
    category: string
    brand: string
    seller_name: string
    admin: number
    commission: number
    buyer_sku_code: string
    buyer_product_status: boolean
    seller_product_status: boolean
    desc: string
  }[]
}

export interface DepositReturnProps extends AxiosResponse {
  data: {
    rc: string
    amount: number
    notes: string
  }
}

export interface TransaksiReturnProps extends AxiosResponse {
  data: {
    ref_id: string
    customer_no: string
    buyer_sku_code: string
    message: string
    status: string
    rc: string
    sn: string
    buyer_last_saldo: number
    price: number
    tele: string
    wa: string
  }
}

export default function createDigiflazzConfig({
  username,
  key,
}: DigiflazzConfigProps): DigiflazzReturnProps<unknown> {
  const endpoint = "https://api.digiflazz.com/v1"

  const cekSaldo = async () => {
    const payload = {
      cmd: "deposit",
      username,
      sign: crypto
        .createHash("md5")
        .update(`${username}${key}depo`)
        .digest("hex"),
    }

    try {
      const { data } = await axios.post<CekSaldoReturnProps>(
        `${endpoint}/cek-saldo`,
        payload,
      )
      return data
    } catch (error) {
      const axiosError = error as AxiosError<unknown>
      if (axiosError.response) {
        const { status, data } = axiosError.response
        let errorMessage = "Unknown error occurred"
        if (typeof data === "string") {
          errorMessage = data
        } else if (data && typeof data === "object" && "message" in data) {
          errorMessage = data.message as string
        }
        throw new Error(`Request failed with status ${status}: ${errorMessage}`)
      } else if (axiosError.request) {
        throw new Error("No response received from the server")
      } else {
        throw new Error("Error setting up the request")
      }
    }
  }

  const daftarHarga = async (cmdOption: PriceListType) => {
    const payload = {
      cmd: cmdOption,
      username,
      sign: crypto
        .createHash("md5")
        .update(`${username}${key}pricelist`)
        .digest("hex"),
    }

    try {
      const { data } = await axios.post<
        DaftarHargaPrePaidReturnProps | DaftarHargaPostPaidReturnProps
      >(`${endpoint}/price-list`, payload)
      return data
    } catch (error) {
      const axiosError = error as AxiosError<unknown>
      if (axiosError.response) {
        const { status, data } = axiosError.response
        let errorMessage = "Unknown error occurred"
        if (typeof data === "string") {
          errorMessage = data
        } else if (data && typeof data === "object" && "message" in data) {
          errorMessage = data.message as string
        }
        throw new Error(`Request failed with status ${status}: ${errorMessage}`)
      } else if (axiosError.request) {
        throw new Error("No response received from the server")
      } else {
        throw new Error("Error setting up the request")
      }
    }
  }

  const deposit = async ({ amount, bank, name }: DigiflazzDepositProps) => {
    const payload = {
      username,
      amount,
      Bank: bank,
      owner_name: name,
      sign: crypto
        .createHash("md5")
        .update(`${username}${key}deposit`)
        .digest("hex"),
    }

    try {
      const { data } = await axios.post<DepositReturnProps>(
        `${endpoint}/deposit`,
        payload,
      )
      return data
    } catch (error) {
      const axiosError = error as AxiosError<unknown>
      if (axiosError.response) {
        const { status, data } = axiosError.response
        let errorMessage = "Unknown error occurred"
        if (typeof data === "string") {
          errorMessage = data
        } else if (data && typeof data === "object" && "message" in data) {
          errorMessage = data.message as string
        }
        throw new Error(`Request failed with status ${status}: ${errorMessage}`)
      } else if (axiosError.request) {
        throw new Error("No response received from the server")
      } else {
        throw new Error("Error setting up the request")
      }
    }
  }

  const transaksi = async ({
    sku,
    customerNo,
    refId,
    cmd = null,
    testing,
    msg,
    max_price,
    cb_url,
    allow_dot,
  }: DigiflazzTransactionProps) => {
    const payload = {
      username,
      buyer_sku_code: sku,
      customer_no: customerNo,
      ref_id: refId,
      testing,
      msg,
      ...(cmd && { commands: cmd }),
      ...(max_price && { max_price: max_price }),
      ...(cb_url && { cb_url: cb_url }),
      ...(allow_dot && { allow_dot: allow_dot }),
      sign: crypto
        .createHash("md5")
        .update(`${username}${key}${refId}`)
        .digest("hex"),
    }

    /** NOTE:
    inq-pasca: cek tagihan
    pay-pasca: bayar tagihan
    status-pasca: cek status tagihan
  
    ** Jangan pernah mencoba untuk melakukan Cek Status terhadap transaksi yang sudah lewat 90 HARI karena hal tersebut akan menyebabkan pembuatan transaksi BARU. **
    **/

    if (cmd === "inq-pasca") payload.commands = "inq-pasca"
    if (cmd === "pay-pasca") payload.commands = "pay-pasca"
    if (cmd === "status-pasca") payload.commands = "status-pasca"
    if (cmd === "pln-subscribe") payload.commands = "pln-subscribe"

    try {
      const { data } = await axios.post<TransaksiReturnProps>(
        `${endpoint}/transaction`,
        payload,
      )
      return data
    } catch (error) {
      const axiosError = error as AxiosError<unknown>
      if (axiosError.response) {
        const { status, data } = axiosError.response
        let errorMessage = "Unknown error occurred"
        if (typeof data === "string") {
          errorMessage = data
        } else if (data && typeof data === "object" && "message" in data) {
          errorMessage = data.message as string
        }
        throw new Error(`Request failed with status ${status}: ${errorMessage}`)
      } else if (axiosError.request) {
        throw new Error("No response received from the server")
      } else {
        throw new Error("Error setting up the request")
      }
    }
  }

  return {
    cekSaldo,
    daftarHarga,
    deposit,
    transaksi,
  }
}
