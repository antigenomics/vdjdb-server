package service

import _root_.java.text.{ParseException, SimpleDateFormat}

import models.auth.AuthToken
import models.auth.User
import org.joda.time.DateTime
import play.api.Application
import securesocial.core._
import securesocial.core.providers.Token

import scala.collection.JavaConversions._

/**
 * Created by bvdmitri on 10.02.16.
 */

class AuthService(application: Application) extends UserServicePlugin(application) {

  override def find(identity: IdentityId): Option[Identity] = {
    val user = User.findByUUID(identity.userId)
    if (user == null) return None
    Option.apply(new SocialUser(new IdentityId(user.getUuid, user.getProvider), "", "", "", Option.apply(user.getEmail), null, new AuthenticationMethod("userPassword"),
        null, null, Some.apply(new PasswordInfo("bcrypt", user.getPassword, null))))
  }

  override def findByEmailAndProvider(email: String, providerId: String): Option[Identity] = {
    val user = User.find().where().eq("email", email).eq("provider", providerId).findUnique()
    if (user == null) return None
    Option.apply(new SocialUser(new IdentityId(user.getEmail, user.getProvider), "", "", "", Option.apply(user.getEmail), null, new AuthenticationMethod("userPassword"),
      null, null, Some.apply(new PasswordInfo("bcrypt", user.getPassword, null))))
  }

  override def deleteToken(uuid: String): Unit = {
    val token = AuthToken.findByUUID(uuid)
    if (token != null) token.delete()
  }

  override def save(identity: Identity): Identity = {
    var user = User.findByUUID(identity.identityId.userId)
    if (user == null) {
      user = new User(identity.email.get, identity.identityId.providerId, identity.email.get, identity.passwordInfo.get.password)
      user.saveUser()
    }
    identity
  }

  override def save(token: Token): Unit = {
    val authToken = new AuthToken(token)
    authToken.save()
  }

  override def findToken(uuid: String): Option[Token] = {
    val token = AuthToken.findByUUID(uuid)
    if (token == null) return None
    Option.apply(new Token(uuid, token.getEmail, token.getCreatedAt, token.getExpiredAt, token.isSignUp))
  }

  override def deleteExpiredTokens(): Unit = {
     AuthToken.find().where().lt("expiredAt", new DateTime()).findList().toList.foreach((token: AuthToken) => token.delete())
  }
}
