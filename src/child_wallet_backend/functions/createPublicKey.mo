import Principal "mo:base/Principal";
import Nat8 "mo:base/Nat8";
import Nat32 "mo:base/Nat32";
import Hash "mo:base/Hash";
import HashMap "mo:base/HashMap";
import schema "../storage/schema";
import ecdsa "../libs/ecdsa/ecdsa";
import Debug "mo:base/Debug";

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
    Debug.print("=== createPublicKey === caller=" # Principal.toText(caller) # ", index=" # Nat32.toText(index));
    
    // ステップ1: caller用のMapが存在するか確認
    let personKeyList : schema.PublicKeyListForPerson = switch (state.publicKeyList.get(caller)) {
      case (null) {
        Debug.print("createPublicKey: initialize key map for caller");
        let newList = HashMap.HashMap<Nat32, [Nat8]>(0, Nat32.equal, nat32ToHash);
        state.publicKeyList.put(caller, newList);
        newList;
      };
      case (?existing) existing;
    };

    // ステップ2: indexの公開鍵が存在するか確認
    let publicKey : [Nat8] = switch (personKeyList.get(index)) {
      case (null) {
        Debug.print("createPublicKey: generating new key for index=" # Nat32.toText(index));
        let generated = await ecdsa.public_key(caller, index);
        personKeyList.put(index, generated);
        Debug.print("createPublicKey: saved to state.publicKeyList[caller][" # Nat32.toText(index) # "]");
        generated;
      };
      case (?cached) {
        Debug.print("createPublicKey: returning cached key for index=" # Nat32.toText(index));
        cached;
      };
    };

    let reply : schema.PublicKeyReply = { publicKey = publicKey };
    Debug.print("createPublicKey: done, publicKey length=" # Nat32.toText(Nat32.fromNat(publicKey.size())));
    return reply;
  };
};
