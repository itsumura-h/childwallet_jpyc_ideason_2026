import Principal "mo:base/Principal";
import Nat8 "mo:base/Nat8";
import Nat32 "mo:base/Nat32";
import schema "../storage/schema";
import Debug "mo:base/Debug";

module {
  public func invoke(state : schema.State, caller : Principal, index : Nat32) : schema.PublicKeyReply {
    Debug.print("=== getPublicKey === caller=" # Principal.toText(caller) # ", index=" # Nat32.toText(index));
    let personKeyList : schema.PublicKeyListForPerson = switch (state.publicKeyList.get(caller)) {
      case (null) {
        Debug.print("getPublicKey: no key map for caller");
        Debug.trap("public key not found");
      };
      case (?existing) existing;
    };

    let publicKey : [Nat8] = switch (personKeyList.get(index)) {
      case (null) {
        Debug.print("getPublicKey: key not found at index");
        Debug.trap("public key not found");
      };
      case (?cached) cached;
    };

    let reply : schema.PublicKeyReply = { publicKey = publicKey };
    Debug.print("getPublicKey: success, publicKey length=" # Nat32.toText(Nat32.fromNat(publicKey.size())));
    return reply;
  };
};
