import Text "mo:base/Text";
import Blob "mo:base/Blob";
import Principal "mo:base/Principal";
import Nat32 "mo:base/Nat32";
import schema "./storage/schema";
import storageStore "./storage/storage";
import createPublicKeyFn "./functions/createPublicKey";
import getPublicKeyFn "./functions/getPublicKey";
import signFn "./functions/sign";
import signTextFn "./functions/signText";

persistent actor {
  public query (msg) func get_caller() : async Principal {
    return msg.caller;
  };

  private transient var storage : storageStore.Storage = storageStore.Storage();

  public shared (msg) func createPublicKey(index : Nat32) : async schema.PublicKeyReply {
    return await createPublicKeyFn.invoke(storage.state, msg.caller, index);
  };

  public shared query (msg) func getPublicKey(index : Nat32) : async schema.PublicKeyReply {
    return getPublicKeyFn.invoke(storage.state, msg.caller, index);
  };

  public shared (msg) func sign(message : Blob, index: Nat32) : async schema.SignatureReply {
    return await signFn.invoke(storage.state, msg.caller, message, index);
  };

  public shared (msg) func signText(message : Text, index: Nat32) : async schema.SignatureReply {
    return await signTextFn.invoke(storage.state, msg.caller, message, index);
  };
};
