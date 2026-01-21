import Blob "mo:base/Blob";
import Text "mo:base/Text";
import Principal "mo:base/Principal";
import Nat32 "mo:base/Nat32";
import Debug "mo:base/Debug";
import schema "../storage/schema";
import ecdsa "../libs/ecdsa/ecdsa";
import sha256 "../libs/ecdsa/sha256";

module {
  public func invoke(state : schema.State, caller : Principal, message : Text, index: Nat32) : async schema.SignatureReply {
    Debug.print("=== signText ===");
    Debug.print("caller: " # Principal.toText(caller));
    Debug.print("index: " # Nat32.toText(index));
    
    // 公開鍵が生成済みかチェック
    let personKeyList : schema.PublicKeyListForPerson = switch (state.publicKeyList.get(caller)) {
      case (null) {
        Debug.print("signText: public key not found for caller");
        Debug.trap("public key not found");
      };
      case (?existing) existing;
    };

    let _publicKey = switch (personKeyList.get(index)) {
      case (null) {
        Debug.print("signText: public key not found at index=" # Nat32.toText(index));
        Debug.trap("public key not found");
      };
      case (?cached) {
        Debug.print("signText: public key verified at index=" # Nat32.toText(index));
        cached;
      };
    };

    let message_hash : Blob = Blob.fromArray(sha256.sha256(Blob.toArray(Text.encodeUtf8(message))));
    let signature = await ecdsa.sign(caller, message_hash, index);
    return {
      signature = signature;
    };
  };
};
