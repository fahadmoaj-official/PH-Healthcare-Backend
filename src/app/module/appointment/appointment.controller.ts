import { catchAsync } from "../../utils/catchAsync";
import { sendResponse } from "../../utils/sendResponse";
import type { Request,Response } from "express";
import httpStatus from "http-status";
import { AppoinmentServices } from "./appointment.service";


const bookAppoinment = catchAsync(async(req:Request,res:Response)=>{

    const result = await AppoinmentServices.bookAppoinmentService()

    sendResponse(res,{
        statusCode:httpStatus.OK,
        success:true,
        message: "Bkash Payment is Successfull",
        data:result
    })
})

const bookAppoinmentCallback = catchAsync(async(req:Request,res:Response)=>{

    const result = await AppoinmentServices.bookAppoinmentCallbackService()

    sendResponse(res,{
        statusCode:httpStatus.OK,
        success:true,
        message: "payment callback",
        data:null
    })
})


export const AppointmentController = {
    bookAppoinment,
    bookAppoinmentCallback
}