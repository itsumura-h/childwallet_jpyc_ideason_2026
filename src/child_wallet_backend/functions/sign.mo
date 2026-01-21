import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import schema "../storage/schema";
import ecdsa "./../libs/ecdsa/ecdsa";

module {
  public func invoke(caller : Principal, message : Blob, index: Nat32) : async schema.SignatureReply {
    Debug.print("=== sign ===");
    Debug.print("caller: " # Principal.toText(caller));
    Debug.print("message: " # debug_show (message));
    let signature = await ecdsa.sign(caller, message, index);
    Debug.print("signature: " # debug_show (signature));
    return {
      signature = signature;
    };
  };
};
