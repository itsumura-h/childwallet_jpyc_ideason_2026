import Principal "mo:base/Principal";
import Debug "mo:base/Debug";
import Nat8 "mo:base/Nat8";
import Nat32 "mo:base/Nat32";
import schema "../storage/schema";

module {
  public func invoke(state : schema.State, caller : Principal, index : Nat32) : schema.PublicKeyReply {
    let personKeyList : schema.PublicKeyListForPerson = switch (state.publicKeyList.get(caller)) {
      case (null) {
        Debug.trap("public key not found");
      };
      case (?existing) existing;
    };

    let publicKey : [Nat8] = switch (personKeyList.get(index)) {
      case (null) {
        Debug.trap("public key not found");
      };
      case (?cached) cached;
    };

    return {
      publicKey = publicKey;
    };
  };
};
