import Blob "mo:base/Blob";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import schema "../storage/schema";
import ecdsa "../libs/ecdsa/ecdsa";
import sha256 "../libs/ecdsa/sha256";

module {
  public func invoke(caller : Principal, message : Text, index: Nat32) : async schema.SignatureReply {
    let message_hash : Blob = Blob.fromArray(sha256.sha256(Blob.toArray(Text.encodeUtf8(message))));
    let signature = await ecdsa.sign(caller, message_hash, index);
    return {
      signature = signature;
    };
  };
};
