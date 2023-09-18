import UserModel from "../models/user-model"
import bcrypt from "bcrypt"
import {v4} from "uuid"
import mailService from "./mail-service"
import tokenService from "./token-service"
import UserDto from "../dtos/user-dto"
import ApiError from "../exceptions/api-error"

class UserService {
  async registration(email, password) {
    const candidate = await UserModel.findOne({ email })
    
    if (candidate) throw ApiError.BadRequest(`User with email ${email} is already existed`)

    const hashPassword = await bcrypt.hash(password, 3)
    const activationLink = v4()
    const user = UserModel.create({ email, password: hashPassword, activationLink })
    await mailService.sendActivationMail(email, `${process.env.API_URL}/api/activate/${activationLink}`)

    return this.#generateTokens(user)
  }

  async activate(activationLink) {
    const user = await UserModel.findOne({ activationLink })
    if (!user) {
      throw ApiError.BadRequest('Wrong activation link')
    }
    user.isActivated = true
    await user.save()
  }

  async login(email, password) {
    const user = await UserModel.findOne({ email })
    if (!user) {
      throw ApiError.BadRequest('User has not been found')
    }
    const arePassesEqual = await bcrypt.compare(password, user.password)
    if (!arePassesEqual) {
      throw ApiError.BadRequest('Password is wrong')
    }
    return this.#generateTokens(user)
  }

  async logout(refreshToken) {
    const token = await tokenService.removeToken(refreshToken)
    return token
  }

  async refresh(refreshToken) {
    if (!refreshToken) {
      return ApiError.UnauthorisedError()
    }
    const userData = tokenService.validateRefreshToken(refreshToken)
    const tokenFromDb = await tokenService.findToken(refreshToken)

    if (!userData || !tokenFromDb) {
      throw ApiError.UnauthorisedError()
    }
    const user = await UserModel.findById(userData.id)

    return this.#generateTokens(user)
  }

  async getAllUsers() {
    return await UserModel.find()
  }

  async #generateTokens(user) {
    const userDto = new UserDto(user)
    const tokens = tokenService.generateTokens({ ...userDto })
    await tokenService.saveToken(userDto.id, tokens.refreshToken)

    return {
      ...tokens,
      user: userDto
    }
  }
}

export default new UserService()