import Principal "mo:base/Principal";
import Nat8 "mo:base/Nat8";
import Nat32 "mo:base/Nat32";
import Hash "mo:base/Hash";
import HashMap "mo:base/HashMap";
import schema "../storage/schema";
import ecdsa "../libs/ecdsa/ecdsa";

module {
  private func nat32ToHash(index : Nat32) : Hash.Hash {
    var hash : Nat32 = index;
    hash := hash +% (hash << 10);
    hash := hash ^ (hash >> 6);
    hash := hash +% (hash << 3);
    hash := hash ^ (hash >> 11);
    hash := hash +% (hash << 15);
    hash;
  };

  public func invoke(state : schema.State, caller : Principal, index: Nat32) : async schema.PublicKeyReply {
    let personKeyList : schema.PublicKeyListForPerson = switch (state.publicKeyList.get(caller)) {
      case (null) {
        let newList = HashMap.HashMap<Nat32, [Nat8]>(0, Nat32.equal, nat32ToHash);
        state.publicKeyList.put(caller, newList);
        newList;
      };
      case (?existing) existing;
    };

    let publicKey : [Nat8] = switch (personKeyList.get(index)) {
      case (null) {
        let generated = await ecdsa.public_key(caller, index);
        personKeyList.put(index, generated);
        generated;
      };
      case (?cached) cached;
    };

    return {
      publicKey = publicKey;
    };
  };
};
