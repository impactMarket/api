import { IGlobalInflowStatus, IGlobalOutflowStatus, IGlobalStatus } from "../types";
import TransactionsService from "./transactions";


export default class GlobalStatusService {
    public static async get(): Promise<IGlobalStatus> {
        return await TransactionsService.getGlobalStatus();
    }
    public static async outflow(): Promise<IGlobalOutflowStatus> {
        return await TransactionsService.getOutflowStatus();
    }
    public static async inflow(): Promise<IGlobalInflowStatus> {
        return await TransactionsService.getInflowStatus();
    }
}