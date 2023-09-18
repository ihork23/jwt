import ApiError from "../exceptions/api-error";
import tokenService from "../service/token-service";

export default (req, res, next) => {
  try {
    const accessToken = req.headers.authorization?.split(' ')[1]
    if (!accessToken) {
      return next(ApiError.UnauthorisedError())
    }
    
    const userData = tokenService.validateAccessToken(accessToken)
    if (!userData) {
      return next(ApiError.UnauthorisedError())
    }

    req.user = userData
    next()
  } catch (e) {
    return next(ApiError.UnauthorisedError())
  }
}