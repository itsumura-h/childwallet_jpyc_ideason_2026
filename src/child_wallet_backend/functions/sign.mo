import Principal "mo:base/Principal";
import Nat32 "mo:base/Nat32";
import Debug "mo:base/Debug";
import schema "../storage/schema";
import ecdsa "./../libs/ecdsa/ecdsa";

module {
  public func invoke(state : schema.State, caller : Principal, message : Blob, index: Nat32) : async schema.SignatureReply {
    Debug.print("=== sign ===");
    Debug.print("caller: " # Principal.toText(caller));
    Debug.print("index: " # Nat32.toText(index));
    Debug.print("message: " # debug_show (message));
    
    // 公開鍵が生成済みかチェック
    let personKeyList : schema.PublicKeyListForPerson = switch (state.publicKeyList.get(caller)) {
      case (null) {
        Debug.print("sign: public key not found for caller");
        Debug.trap("public key not found");
      };
      case (?existing) existing;
    };

    let _publicKey = switch (personKeyList.get(index)) {
      case (null) {
        Debug.print("sign: public key not found at index=" # Nat32.toText(index));
        Debug.trap("public key not found");
      };
      case (?cached) {
        Debug.print("sign: public key verified at index=" # Nat32.toText(index));
        cached;
      };
    };

    let signature = await ecdsa.sign(caller, message, index);
    Debug.print("signature: " # debug_show (signature));
    return {
      signature = signature;
    };
  };
};
